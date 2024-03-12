Imports System.Web.Caching
Imports System.Data
Imports System.Data.SqlClient
Imports System.Math
Imports Tools
Imports Dapper
Imports System.Environment
Imports System.Runtime.Caching

Namespace Models
  Public Structure LatLong
    Public Latitude As Double
    Public Longitude As Double
    Public Elevation As Double
  End Structure

  Public Structure Point
    Public X As Double
    Public Y As Double
  End Structure

  Public Class CADData
    Public Const AppID As Integer = 10002 ' Maintenance table application ID
    Private Const GRIDSQUARE_SET_COL_SIZE As Integer = 8, GRIDSQUARE_SET_ROW_SIZE As Integer = 20
    Private Const BLOCK_SIZE As Integer = 100000
    ' For testing, we'll set the errorhandling this way, after we get the app running, change it to
    ' email/DB
    Public Const ErrorHandling As Tools.DB.DB_Error_Handling_Method = DB.DB_Error_Handling_Method.Send_Errors_To_Log_Only
    Public CAD As String = ConfigurationManager.ConnectionStrings("CAD").ConnectionString
    Public CST As String = ConfigurationManager.ConnectionStrings("Telestaff").ConnectionString
    Public GIS As String = ConfigurationManager.ConnectionStrings("GIS").ConnectionString

    Public Function Get_Data(Of T)(query As String, cs As String) As List(Of T)
      Try

        Using db As IDbConnection = New SqlConnection(cs)
          Return db.Query(Of T)(query)
        End Using
      Catch ex As Exception
        Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Public Function Get_Data(Of T)(query As String, dp As DynamicParameters, cs As String) As List(Of T)
      Try

        Using db As IDbConnection = New SqlConnection(cs)
          Return db.Query(Of T)(query, dp)
        End Using
      Catch ex As Exception
        Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Public Shared Function IsInternal() As Boolean
      Select Case Environment.MachineName.ToUpper
        Case "CLAYBCCIIS01", "MISSL01", "MISCD01"
          Return True
        Case Else
          Return False
      End Select
    End Function

    Public Shared Function GetRecentStreets() As List(Of String)
      Dim query As String = "
      SELECT DISTINCT
        LTRIM(RTRIM(street)) street
      FROM inmain
      WHERE
        cancelled=0
        AND inci_id != ''
        AND LEN(street) > 0
        AND CAST(calltime AS DATE) > DATEADD(DAY, -30, CAST(GETDATE() AS DATE))"
      Dim c As New CADData()
      Return c.Get_Data(Of String)(query, c.CAD)
    End Function

    Public Shared Function GetCachedRecentStreets() As List(Of String)
      Dim CIP As New CacheItemPolicy With {
        .AbsoluteExpiration = Now.AddSeconds(30)
      }
      Return myCache.GetItem("RecentCalls", CIP)
    End Function


    Public Function Save_Tracking(ByRef FTD As Full_Tracking_Data) As Boolean
      Dim d As New Tools.DB(CAD, AppID, ErrorHandling), sbQuery As New StringBuilder
      With sbQuery
        .AppendLine("USE Tracking;")
        .Append("INSERT INTO tracking_data (ip_address, group_name, user_id, latitude, longitude, accuracy, altitude, ")
        .Append("altitude_accuracy, heading, speed, user_agent, user_date_captured) ")
        .Append("VALUES (@ip, @groupname, @userid, @latitude, @longitude, @accuracy, @altitude, ")
        .Append("@altitudeaccuracy, @heading, @speed, @useragent, @user_date);")
      End With
      Try
        Dim p(11) As SqlParameter
        p(0) = New SqlParameter("@ip", Data.SqlDbType.VarChar) With {.Value = FTD.IPAddress}
        p(1) = New SqlParameter("@groupname", Data.SqlDbType.VarChar) With {.Value = FTD.GroupName}
        p(2) = New SqlParameter("@userid", Data.SqlDbType.VarChar) With {.Value = FTD.UserID}
        p(3) = New SqlParameter("@latitude", Data.SqlDbType.Float) With {.Value = FTD.Latitude}
        p(4) = New SqlParameter("@longitude", Data.SqlDbType.Float) With {.Value = FTD.Longitude}
        p(5) = New SqlParameter("@useragent", Data.SqlDbType.VarChar) With {.Value = FTD.UserAgent}
        p(6) = New SqlParameter("@user_date", Data.SqlDbType.DateTime) With {.Value = FTD.User_Date_AsDate}
        p(7) = New SqlParameter("@accuracy", Data.SqlDbType.Float) With {.Value = FTD.Accuracy}
        p(8) = New SqlParameter("@altitude", Data.SqlDbType.Float) With {.Value = IIf(FTD.Altitude.HasValue, FTD.Altitude.Value, DBNull.Value)}
        p(9) = New SqlParameter("@altitudeaccuracy", Data.SqlDbType.Float) With {.Value = IIf(FTD.AltitudeAccuracy.HasValue, FTD.AltitudeAccuracy.Value, DBNull.Value)}
        p(10) = New SqlParameter("@heading", Data.SqlDbType.Float) With {.Value = IIf(FTD.Heading.HasValue, FTD.Heading.Value, DBNull.Value)}
        p(11) = New SqlParameter("@speed", Data.SqlDbType.Float) With {.Value = IIf(FTD.Speed.HasValue, FTD.Speed.Value, DBNull.Value)}
        Dim i As Integer = d.ExecuteNonQuery(sbQuery.ToString, p)
        Return (i = 1)
      Catch ex As Exception
        Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
        Return False
      End Try
    End Function

    Public Function Convert_SP_To_LatLong(baseX As Double, baseY As Double) As LatLong
      ' Web Mercator WKT
      'Dim s As String = "PROJCS[""WGS_1984_Web_Mercator"",GEOGCS[""GCS_WGS_1984_Major_Auxiliary_Sphere"",DATUM[""D_WGS_1984_Major_Auxiliary_Sphere"",SPHEROID[""WGS_1984_Major_Auxiliary_Sphere"",6378137.0,0.0]],PRIMEM[""Greenwich"",0.0],UNIT[""Degree"",0.017453292519943295]],PROJECTION[""Mercator""],PARAMETER[""False_Easting"",0.0],PARAMETER[""False_Northing"",0.0],PARAMETER[""Central_Meridian"",0.0],PARAMETER[""standard_parallel_1"",0.0],UNIT[""Meter"",1.0]]"
      Dim source_wkt As String = "PROJCS[""NAD_1983_HARN_StatePlane_Florida_East_FIPS_0901_Feet"",GEOGCS[""GCS_North_American_1983_HARN"",DATUM[""NAD83_High_Accuracy_Regional_Network"",SPHEROID[""GRS_1980"",6378137.0,298.257222101]],PRIMEM[""Greenwich"",0.0],UNIT[""Degree"",0.0174532925199433]],PROJECTION[""Transverse_Mercator""],PARAMETER[""False_Easting"",656166.6666666665],PARAMETER[""False_Northing"",0.0],PARAMETER[""Central_Meridian"",-81.0],PARAMETER[""Scale_Factor"",0.9999411764705882],PARAMETER[""Latitude_Of_Origin"",24.33333333333333],UNIT[""Foot_US"",0.3048006096012192]]"
      'Dim target_wkt As String = "GEOGCS[""GCS_WGS_1984"",DATUM[""D_WGS_1984"",SPHEROID[""WGS_1984"",6378137,298.257223563]],PRIMEM[""Greenwich"",0],UNIT[""Degree"",0.017453292519943295]]"
      Dim x As New ProjNet.CoordinateSystems.CoordinateSystemFactory
      Dim csource As ProjNet.CoordinateSystems.CoordinateSystem = x.CreateFromWkt(source_wkt)
      Dim ctarget As ProjNet.CoordinateSystems.CoordinateSystem = ProjNet.CoordinateSystems.GeographicCoordinateSystem.WGS84 'x.CreateFromWkt(target_wkt)
      Dim t As New ProjNet.CoordinateSystems.Transformations.CoordinateTransformationFactory
      Dim trans As ProjNet.CoordinateSystems.Transformations.CoordinateTransformation = t.CreateFromCoordinateSystems(csource, ctarget)
      Dim point() As Double = {baseX, baseY}
      Dim convpoint() As Double = trans.MathTransform.Transform(point)
      Dim ll As New LatLong With {
        .Longitude = convpoint(0),
        .Latitude = convpoint(1),
        .Elevation = convpoint(2)
      }
      Return ll
    End Function

    Public Function Convert_SP_To_USNG(X As Double, Y As Double) As String
      If X = 0 Or Y = 0 Then Return ""
      Dim ll As LatLong = Convert_SP_To_LatLong(X, Y)
      Return Convert_LatLong_To_USNG(ll.Latitude, ll.Longitude)
    End Function

    Public Function Convert_LatLong_To_SP(Latitude As Double, Longitude As Double) As Point
      Dim source_wkt As String = "PROJCS[""NAD_1983_HARN_StatePlane_Florida_East_FIPS_0901_Feet"",GEOGCS[""GCS_North_American_1983_HARN"",DATUM[""NAD83_High_Accuracy_Regional_Network"",SPHEROID[""GRS_1980"",6378137.0,298.257222101]],PRIMEM[""Greenwich"",0.0],UNIT[""Degree"",0.0174532925199433]],PROJECTION[""Transverse_Mercator""],PARAMETER[""False_Easting"",656166.6666666665],PARAMETER[""False_Northing"",0.0],PARAMETER[""Central_Meridian"",-81.0],PARAMETER[""Scale_Factor"",0.9999411764705882],PARAMETER[""Latitude_Of_Origin"",24.33333333333333],UNIT[""Foot_US"",0.3048006096012192]]"
      'Dim target_wkt As String = "GEOGCS[""GCS_WGS_1984"",DATUM[""D_WGS_1984"",SPHEROID[""WGS_1984"",6378137,298.257223563]],PRIMEM[""Greenwich"",0],UNIT[""Degree"",0.017453292519943295]]"
      Dim x As New ProjNet.CoordinateSystems.CoordinateSystemFactory
      Dim ctarget As ProjNet.CoordinateSystems.CoordinateSystem = x.CreateFromWkt(source_wkt)
      Dim csource As ProjNet.CoordinateSystems.CoordinateSystem = ProjNet.CoordinateSystems.GeographicCoordinateSystem.WGS84 'x.CreateFromWkt(target_wkt)
      Dim t As New ProjNet.CoordinateSystems.Transformations.CoordinateTransformationFactory
      Dim trans As ProjNet.CoordinateSystems.Transformations.CoordinateTransformation = t.CreateFromCoordinateSystems(csource, ctarget)
      Dim p() As Double = {Longitude, Latitude}
      Dim convpoint() As Double = trans.MathTransform.Transform(p)
      Dim pp As New Point With {
        .Y = convpoint(0),
        .X = convpoint(1)
      }
      Return pp
    End Function

    Private Function GetBand(latitude As Double) As String
      If latitude <= 84 AndAlso latitude >= 72 Then
        Return "X"
      ElseIf latitude < 72 AndAlso latitude >= 64 Then
        Return "W"
      ElseIf latitude < 64 AndAlso latitude >= 56 Then
        Return "V"
      ElseIf latitude < 56 AndAlso latitude >= 48 Then
        Return "U"
      ElseIf latitude < 48 AndAlso latitude >= 40 Then
        Return "T"
      ElseIf latitude < 40 AndAlso latitude >= 32 Then
        Return "S"
      ElseIf latitude < 32 AndAlso latitude >= 24 Then
        Return "R"
      ElseIf latitude < 24 AndAlso latitude >= 16 Then
        Return "Q"
      ElseIf latitude < 16 AndAlso latitude >= 8 Then
        Return "P"
      ElseIf latitude < 8 AndAlso latitude >= 0 Then
        Return "N"
      ElseIf latitude < 0 AndAlso latitude >= -8 Then
        Return "M"
      ElseIf latitude < -8 AndAlso latitude >= -16 Then
        Return "L"
      ElseIf latitude < -16 AndAlso latitude >= -24 Then
        Return "K"
      ElseIf latitude < -24 AndAlso latitude >= -32 Then
        Return "J"
      ElseIf latitude < -32 AndAlso latitude >= -40 Then
        Return "H"
      ElseIf latitude < -40 AndAlso latitude >= -48 Then
        Return "G"
      ElseIf latitude < -48 AndAlso latitude >= -56 Then
        Return "F"
      ElseIf latitude < -56 AndAlso latitude >= -64 Then
        Return "E"
      ElseIf latitude < -64 AndAlso latitude >= -72 Then
        Return "D"
      ElseIf latitude < -72 AndAlso latitude >= -80 Then
        Return "C"
      Else
        Return Nothing
      End If
    End Function

    Private Shared Function GetZone(latitude As Double, longitude As Double) As Integer
      ' Norway
      If latitude >= 56 AndAlso latitude < 64 AndAlso longitude >= 3 AndAlso longitude < 13 Then
        Return 32
      End If

      ' Spitsbergen
      If latitude >= 72 AndAlso latitude < 84 Then
        If longitude >= 0 AndAlso longitude < 9 Then
          Return 31
        ElseIf longitude >= 9 AndAlso longitude < 21 Then
          Return 33
        End If
        If longitude >= 21 AndAlso longitude < 33 Then
          Return 35
        End If
        If longitude >= 33 AndAlso longitude < 42 Then
          Return 37
        End If
      End If

      Return CInt(Math.Ceiling((longitude + 180) / 6))
    End Function

    Public Function Convert_LatLong_To_UTM(latitude As Double, longitude As Double) As String
      If latitude < -80 OrElse latitude > 84 Then
        Return Nothing
      End If
      Dim zone As Integer = GetZone(latitude, longitude)
      Dim band As String = GetBand(latitude)
      'Transform to UTM
      Dim ctfac As New ProjNet.CoordinateSystems.Transformations.CoordinateTransformationFactory()
      Dim wgs84geo As ProjNet.CoordinateSystems.CoordinateSystem = ProjNet.CoordinateSystems.GeographicCoordinateSystem.WGS84
      Dim utm As ProjNet.CoordinateSystems.CoordinateSystem = ProjNet.CoordinateSystems.ProjectedCoordinateSystem.WGS84_UTM(zone, latitude > 0)
      Dim trans As ProjNet.CoordinateSystems.Transformations.CoordinateTransformation = ctfac.CreateFromCoordinateSystems(wgs84geo, utm)
      Dim pUtm As Double() = trans.MathTransform.Transform(New Double() {longitude, latitude})
      Dim easting As Double = pUtm(0)
      Dim northing As Double = pUtm(1)
      Return [String].Format("{0}{1} {2:0} {3:0}", zone, band, easting, northing)
    End Function

    Public Function Convert_LatLong_To_USNG(Latitude As Double, Longitude As Double) As String
      Dim NORTHING_OFFSET As Double = 10000000.0 '; // (meters) ' if we're looking at the southern hemisphere
      Dim ZoneNumber As Integer = Get_Zonenumber(Latitude, Longitude)
      Dim UTM As String = Convert_LatLong_To_UTM(Latitude, Longitude)
      Dim s() As String = UTM.Split(" ")
      Dim UTMEasting As Integer = s(1)
      Dim UTMNorthing As Integer = s(2)
      Dim lat As Double = Latitude
      Dim lon As Double = Longitude
      If lat < 0 Then UTMNorthing += NORTHING_OFFSET
      Dim USNGLetters As String = Find_Grid_Letters(ZoneNumber, UTMNorthing, UTMEasting)
      Dim USNGNorthing As String = Math.Round(UTMNorthing).ToString '.Substring(Math.Round(UTMEasting).ToString.Length - 5) ' Mod BLOCK_SIZE
      USNGNorthing = USNGNorthing.Substring(USNGNorthing.Length - 5).Substring(0, 4)
      Dim USNGEasting As String = Math.Round(UTMEasting).ToString '.Substring(Math.Round(UTMEasting).ToString.Length - 5) 'Mod BLOCK_SIZE
      USNGEasting = USNGEasting.Substring(USNGEasting.Length - 5).Substring(0, 4)
      Dim USNG As String = Get_Zonenumber(lat, lon) & UTMLetterDesignator(lat) & USNGLetters & " " & USNGEasting & " " & USNGNorthing
      Return USNG
    End Function

    Private Function UTMLetterDesignator(latitude As Double) As String
      Dim letterDesignator As String
      If (84 >= latitude) AndAlso (latitude >= 72) Then
        letterDesignator = "X"
      ElseIf (72 > latitude) AndAlso (latitude >= 64) Then
        letterDesignator = "W"
      ElseIf (64 > latitude) AndAlso (latitude >= 56) Then
        letterDesignator = "V"
      ElseIf (56 > latitude) AndAlso (latitude >= 48) Then
        letterDesignator = "U"
      ElseIf (48 > latitude) AndAlso (latitude >= 40) Then
        letterDesignator = "T"
      ElseIf (40 > latitude) AndAlso (latitude >= 32) Then
        letterDesignator = "S"
      ElseIf (32 > latitude) AndAlso (latitude >= 24) Then
        letterDesignator = "R"
      ElseIf (24 > latitude) AndAlso (latitude >= 16) Then
        letterDesignator = "Q"
      ElseIf (16 > latitude) AndAlso (latitude >= 8) Then
        letterDesignator = "P"
      ElseIf (8 > latitude) AndAlso (latitude >= 0) Then
        letterDesignator = "N"
      ElseIf (0 > latitude) AndAlso (latitude >= -8) Then
        letterDesignator = "M"
      ElseIf (-8 > latitude) AndAlso (latitude >= -16) Then
        letterDesignator = "L"
      ElseIf (-16 > latitude) AndAlso (latitude >= -24) Then
        letterDesignator = "K"
      ElseIf (-24 > latitude) AndAlso (latitude >= -32) Then
        letterDesignator = "J"
      ElseIf (-32 > latitude) AndAlso (latitude >= -40) Then
        letterDesignator = "H"
      ElseIf (-40 > latitude) AndAlso (latitude >= -48) Then
        letterDesignator = "G"
      ElseIf (-48 > latitude) AndAlso (latitude >= -56) Then
        letterDesignator = "F"
      ElseIf (-56 > latitude) AndAlso (latitude >= -64) Then
        letterDesignator = "E"
      ElseIf (-64 > latitude) AndAlso (latitude >= -72) Then
        letterDesignator = "D"
      ElseIf (-72 > latitude) AndAlso (latitude >= -80) Then
        letterDesignator = "C"
      Else
        letterDesignator = "Z" '// This is here as an error flag to show   '// that the latitudeitude is outside the UTM limits
      End If
      Return letterDesignator
    End Function

    Private Function Find_Grid_Letters(ZoneNumber As Integer, Northing As Double, Easting As Double) As String
      Dim row As Integer = 1
      Dim north_1m As Double = Math.Round(Northing)
      Do While north_1m > BLOCK_SIZE
        north_1m -= BLOCK_SIZE
        row += 1
      Loop
      row = row Mod GRIDSQUARE_SET_ROW_SIZE
      Dim col As Integer = 0
      Dim east_1m As Double = Math.Round(Easting)
      Do While east_1m > BLOCK_SIZE
        east_1m -= BLOCK_SIZE
        col += 1
      Loop
      col = col Mod GRIDSQUARE_SET_COL_SIZE
      Return LettersHelper(FindSet(ZoneNumber), row, col)
    End Function

    Private Function Get_Zonenumber(latitude As Double, longitude As Double) As Integer
      '  // convert 0-360 to [-180 to 180] range
      Dim lonTemp As Double = (longitude + 180) - CType((longitude + 180) / 360, Integer) * 360 - 180
      Dim zoneNumber As Integer = CType((lonTemp + 180) / 6, Integer) + 1
      '  // Handle special case of west coast of Norway
      If latitude >= 56.0 AndAlso latitude < 64.0 AndAlso lonTemp >= 3.0 AndAlso lonTemp < 12.0 Then
        zoneNumber = 32
      End If
      '  // Special zones for Svalbard
      If latitude >= 72.0 AndAlso latitude < 84.0 Then
        If lonTemp >= 0.0 AndAlso lonTemp < 9.0 Then
          zoneNumber = 31
        ElseIf lonTemp >= 9.0 AndAlso lonTemp < 21.0 Then
          zoneNumber = 33
        ElseIf lonTemp >= 21.0 AndAlso lonTemp < 33.0 Then
          zoneNumber = 35
        ElseIf lonTemp >= 33.0 AndAlso lonTemp < 42.0 Then
          zoneNumber = 37
        End If
      End If
      Return zoneNumber
    End Function

    Private Function FindSet(ZoneNumber As Integer) As Integer
      Select Case ZoneNumber Mod 6
        Case 1 To 5
          Return ZoneNumber Mod 6
        Case 0
          Return 6
        Case Else
          Return -1
      End Select
    End Function

    Private Function LettersHelper(letterset As Integer, row As Integer, col As Integer) As String
      If row = 0 Then
        row = GRIDSQUARE_SET_ROW_SIZE - 1
      Else
        row -= 1
      End If
      If col = 0 Then
        col = GRIDSQUARE_SET_COL_SIZE - 1
      Else
        col -= 1
      End If
      Dim r1 As String = "ABCDEFGHJKLMNPQRSTUV"
      Dim c1 As String = "ABCDEFGH"
      Dim r2 As String = "FGHJKLMNPQRSTUVABCDE"
      Dim c2 As String = "JKLMNPQR"
      Dim c3 As String = "STUVWXYZ"
      Select Case letterset
        Case 1
          Return GetRowCol(r1, c1, row, col)
        Case 2
          Return GetRowCol(r2, c2, row, col)
        Case 3
          Return GetRowCol(r1, c3, row, col)
        Case 4
          Return GetRowCol(r2, c1, row, col)
        Case 5
          Return GetRowCol(r1, c2, row, col)
        Case 6
          Return GetRowCol(r2, c3, row, col)
      End Select
      Return ""
    End Function

    Function GetRowCol(rowStr, colStr, row, col) As String
      Return colStr.substring(col, 1) & rowStr.Substring(row, 1)
    End Function

    Public Class UnitTracking
      Private _lat As Double = 0, _long As Double = 0
      Public Property UnitName As String ' The unit designation name
      Public Property UnitStatus As String ' The unit's current status.  This will be blank unless they are assigned to something.
      Public Property UnitType As String ' The kind of unit, ie: Tanker, rescue, Engine, Ladder, etc.
      Public Property IncidentID As String ' The inci_id this unit is assigned to.  This will be empty for most active units
      Public Property District As String ' This is the unit's current assigned geographic area.
      Public Property Location As String ' If there is a location set, it'll show it.
      Public Property GeoX As Double
      Public Property GeoY As Double
      Public ReadOnly Property Latitude As Double
        Get
          If _lat = 0 Then
            Dim C As New CADData
            Dim ll As LatLong = C.Convert_SP_To_LatLong(GeoX, GeoY)
            _lat = ll.Latitude
            _long = ll.Longitude
          End If
          Return _lat
        End Get
      End Property
      Public ReadOnly Property Longitude As Double
        Get
          If _long = 0 Then
            Dim C As New CADData
            Dim ll As LatLong = C.Convert_SP_To_LatLong(GeoX, GeoY)
            _lat = ll.Latitude
            _long = ll.Longitude
          End If
          Return _long
        End Get
      End Property
      Public Property Timestamp As Date
      Public Property Speed As Double
      Public Property Heading As Double
    End Class

    Public Class Tracking_Data
      Public Property GroupName As String
      Public Property UserID As String
      Public Property Latitude As Double
      Public Property Longitude As Double
      Public Property Accuracy As Double
      Public Property Altitude As Double?
      Public Property AltitudeAccuracy As Double?
      Public Property Heading As Double?
      Public Property Speed As Double?
      Public Property User_Date As String
      Public ReadOnly Property User_Date_AsDate
        Get
          Dim d As New Date
          If DateTime.TryParse(User_Date, d) Then
            Return d
          Else
            Return Now()
          End If
        End Get
      End Property
    End Class

    Public Class Full_Tracking_Data
      Inherits Tracking_Data

      Public Property IPAddress As String
      Public Property UserAgent As String

    End Class

    Public Function Tracking_Data_To_Full_Tracking_Data(td As Tracking_Data, IPAddress As String, UserAgent As String) As Full_Tracking_Data
      Dim ftd As New Full_Tracking_Data With {
        .GroupName = td.GroupName,
        .IPAddress = IPAddress,
        .Latitude = td.Latitude,
        .Longitude = td.Longitude,
        .Accuracy = td.Accuracy,
        .Altitude = td.Altitude,
        .AltitudeAccuracy = td.AltitudeAccuracy,
        .Heading = td.Heading,
        .Speed = td.Speed,
        .User_Date = td.User_Date,
        .UserAgent = UserAgent,
        .UserID = td.UserID
      }
      Return ftd
    End Function

    Public Function Tracking_Data_List_To_Full_Tracking_Data_List(tdl As List(Of Tracking_Data), IPAddress As String, UserAgent As String) As List(Of Full_Tracking_Data)
      Dim ftdl As New List(Of Full_Tracking_Data)
      For Each t In tdl
        ftdl.Add(Tracking_Data_To_Full_Tracking_Data(t, IPAddress, UserAgent))
      Next
      Return ftdl
    End Function


  End Class

End Namespace

