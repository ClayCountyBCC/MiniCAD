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
        Case "CLAYBCCIIS01", "MISSL01"
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
      Dim CIP As New CacheItemPolicy
      CIP.AbsoluteExpiration = Now.AddSeconds(30)
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

    'Private Sub Add_USNG_To_Notes(IncidentID As String, USNG As String)
    '  Dim d As New Tools.DB(CAD, AppID, ErrorHandling)
    '  Dim sbQuery As New StringBuilder
    '  With sbQuery
    '    .Append("UPDATE incident SET notes = CONVERT(nvarchar(MAX), notes) + '").Append(vbCrLf)
    '    .Append("'USNG Location: ").Append(USNG).Append(" [").Append(Now.ToString).Append(" MINICAD]'")
    '    .Append("WHERE inci_id='").Append(IncidentID).Append("' AND PATINDEX('%USNG Location:%', notes) = 0;")
    '  End With
    '  Try
    '    d.ExecuteNonQuery(sbQuery.ToString)
    '  Catch ex As Exception
    '    Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
    '  End Try
    'End Sub

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
      Dim ll As New LatLong
      ll.Longitude = convpoint(0)
      ll.Latitude = convpoint(1)
      ll.Elevation = convpoint(2)
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
      Dim pp As New Point
      pp.Y = convpoint(0)
      pp.X = convpoint(1)
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







    Public Function GetUnitStatus() As List(Of ActiveUnit)
      ' This is for historical calls only, this will return a list of units() for a particular inci_id
      Dim d As New Tools.DB(CAD, AppID, ErrorHandling)
      Dim sbQuery As New StringBuilder
      With sbQuery
        .AppendLine("SELECT 0 as geox, 0 as geoy, I.transtype, I.unitcode, I.inci_id, '' AS kind FROM incilog I INNER JOIN ")
        .AppendLine("	(SELECT MAX(timestamp) as timestamp, unitcode, inci_id FROM incilog ")
        .AppendLine("	WHERE inci_id IN ")
        .AppendLine("(SELECT inci_id FROM inmain WHERE cancelled=0 ")
        .AppendLine("AND calltime > DATEADD(dd, -7, CAST(GETDATE() AS DATE))) ")
        .AppendLine("AND unitcode <> '' AND transtype IN ('A', 'C', 'D', 'E', 'H', 'T', 'X') ")
        .AppendLine("	GROUP BY unitcode, inci_id) I2 ON I.timestamp = I2.timestamp AND I.unitcode=I2.unitcode AND I.inci_id=I2.inci_id ")
        .AppendLine("ORDER BY I.inci_id DESC")
      End With
      Try
        Dim ds As DataSet = d.Get_Dataset(sbQuery.ToString)
        Dim li As New List(Of ActiveUnit)(From dbRow In ds.Tables(0).AsEnumerable() Select GetUnitsByDataRow(dbRow))
        Return li
      Catch ex As Exception
        Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Public Function GetShortActiveUnitStat(StaffList As List(Of Telestaff_Staff)) As List(Of ActiveUnit)
      ' This is used for active calls and for the overall unit status data
      Dim D As New Tools.DB(CAD, AppID, ErrorHandling)
      Dim sbQuery As New StringBuilder
      With sbQuery
        ' Old Query, testing new version below.
        '.AppendLine("SELECT * FROM (SELECT (CASE WHEN UD.unitrecom = 0 THEN 'OUT' ELSE UD.status END) AS transtype, UD.location, ")
        '.AppendLine("UD.unitcode, UD.inci_id, UD.primeoffc, LTRIM(RTRIM(UD.statbeat)) AS statbeat, UD.geox, UD.geoy, NULL AS timestamp, ")
        '.AppendLine("(CASE WHEN UN.groupcode IN ('HELO', 'MUTAID') THEN 'MUTAID' ELSE CASE LEFT(UD.unitcode, 3) WHEN 'VFM' THEN 'MEL' ")
        '.AppendLine("WHEN 'VBR' THEN 'BRAD' WHEN 'VFB' THEN 'BRAD' WHEN 'VUT' THEN 'UTIL' ELSE CASE LEFT(UD.unitcode, 2) ")
        '.AppendLine("WHEN 'VO' THEN 'BC' WHEN 'VP' THEN 'PUT' WHEN 'UT' THEN 'UTIL' WHEN 'VW' THEN 'WOODS' WHEN 'PU' THEN 'PUT' ")
        '.AppendLine("WHEN 'TJ' THEN 'JAX' WHEN 'HR' THEN 'HAZ' WHEN 'FJ' THEN 'JAX' WHEN 'LJ' THEN 'JAX' WHEN 'RJ' THEN 'JAX' ")
        '.AppendLine("WHEN 'RS' THEN 'STJ' WHEN 'FS' THEN 'STJ' WHEN 'FN' THEN 'NAS' WHEN 'VA' THEN 'AIR' WHEN 'LN' THEN 'NAS' ")
        '.AppendLine("WHEN 'FF' THEN 'PUT' WHEN 'RP' THEN 'PUT' WHEN 'FG' THEN 'PUT' WHEN 'FM' THEN 'PUT' WHEN 'RM' THEN 'PUT' ")
        '.AppendLine("WHEN 'BR' THEN 'BRAD' WHEN 'FB' THEN 'BRAD' WHEN 'RB' THEN 'BRAD' ELSE CASE LEFT(UD.unitcode, 1) WHEN 'J' THEN 'JAX' ")
        '.AppendLine("WHEN 'W' THEN 'WOODS' WHEN 'S' THEN 'STJ' WHEN 'N' THEN 'NAS' WHEN 'A' THEN 'AIR' ELSE UN.kind END END END END) AS kind ")
        '.AppendLine("FROM undisp UD INNER JOIN unit UN ON UD.unitcode=UN.unitcode ")
        '.AppendLine("WHERE (LTRIM(RTRIM(UN.kind)) IN ('ENGINE', 'BRUSH', 'BC', 'LADDER', 'RESCUE', 'TANKER', 'HAZ', 'QR') AND ")
        '.AppendLine("UD.unitcode NOT IN ('R1', 'R2', 'R3', 'R5', 'R8', 'BAT1A', 'BAT1B', 'BAT1C', 'BAT2A', 'BAT2B', 'BAT2C', 'DISP')) ")
        '.AppendLine("OR (UD.unitcode IN ('AIR22', 'AIR14', 'HR15', 'VOL9') OR UN.groupcode IN ('MUTAID', 'HELO'))")
        '.AppendLine(") AS AAA ORDER BY kind ASC, unitcode ASC")
        ' Old query, adding unit_tracking_data now
        '.AppendLine("SELECT * FROM (SELECT (CASE WHEN UD.unitrecom = 0 THEN 'OUT' ELSE UD.status END) AS transtype, UD.location, ")
        '.AppendLine("UD.unitcode, UD.inci_id, UD.primeoffc, LTRIM(RTRIM(UD.statbeat)) AS statbeat, A1.geox, A1.geoy, A1.timestamp, A1.heading, A1.speed, ")
        '.AppendLine("(CASE WHEN UN.groupcode IN ('HELO', 'MUTAID') THEN 'MUTAID' ELSE CASE LEFT(UD.unitcode, 3) WHEN 'VFM' THEN 'MEL' ")
        '.AppendLine("WHEN 'VBR' THEN 'BRAD' WHEN 'VFB' THEN 'BRAD' WHEN 'VUT' THEN 'UTIL' ELSE CASE LEFT(UD.unitcode, 2) ")
        '.AppendLine("WHEN 'VO' THEN 'BC' WHEN 'VP' THEN 'PUT' WHEN 'UT' THEN 'UTIL' WHEN 'VW' THEN 'WOODS' WHEN 'PU' THEN 'PUT' ")
        '.AppendLine("WHEN 'TJ' THEN 'JAX' WHEN 'HR' THEN 'HAZ' WHEN 'FJ' THEN 'JAX' WHEN 'LJ' THEN 'JAX' WHEN 'RJ' THEN 'JAX' ")
        '.AppendLine("WHEN 'RS' THEN 'STJ' WHEN 'FS' THEN 'STJ' WHEN 'FN' THEN 'NAS' WHEN 'VA' THEN 'AIR' WHEN 'LN' THEN 'NAS' ")
        '.AppendLine("WHEN 'FF' THEN 'PUT' WHEN 'RP' THEN 'PUT' WHEN 'FG' THEN 'PUT' WHEN 'FM' THEN 'PUT' WHEN 'RM' THEN 'PUT' ")
        '.AppendLine("WHEN 'BR' THEN 'BRAD' WHEN 'FB' THEN 'BRAD' WHEN 'RB' THEN 'BRAD' ELSE CASE LEFT(UD.unitcode, 1) WHEN 'J' THEN 'JAX' ")
        '.AppendLine("WHEN 'W' THEN 'WOODS' WHEN 'S' THEN 'STJ' WHEN 'N' THEN 'NAS' WHEN 'A' THEN 'AIR' ELSE UN.kind END END END END) AS kind ")
        '.AppendLine("FROM undisp UD INNER JOIN unit UN ON UD.unitcode=UN.unitcode ")
        '.AppendLine("LEFT OUTER JOIN vwMaxAvllogidByUnit A1 ON LTRIM(RTRIM(UD.unitcode)) = LTRIM(RTRIM(A1.unitcode)) ")
        '.AppendLine("WHERE (LTRIM(RTRIM(UN.kind)) IN ('ENGINE', 'BRUSH', 'BC', 'LADDER', 'RESCUE', 'TANKER', 'HAZ', 'QR') AND ")
        '.AppendLine("UD.unitcode NOT IN ('R1', 'R2', 'R3', 'R5', 'R8', 'BAT1A', 'BAT1B', 'BAT1C', 'BAT2A', 'BAT2B', 'BAT2C', 'DISP')) ")
        '.AppendLine("OR (UD.unitcode IN ('AIR22', 'AIR14', 'HR15', 'VOL9') OR UN.groupcode IN ('MUTAID', 'HELO'))) AS AAA ORDER BY kind ASC, unitcode ASC")
        ' New query
        ' BROKE
        '.AppendLine("SELECT AA.*,UTD.longitude, UTD.latitude, UTD.date_last_communicated FROM (SELECT LTRIM(RTRIM(homestbt)) AS homestbt, ")
        '.AppendLine("(CASE WHEN UD.unitrecom = 0 AND UD.basedname LIKE '%USING%' THEN 'SWAP' ELSE ")
        '.AppendLine(" CASE WHEN UD.unitrecom = 0 AND UD.basedname LIKE '%BRO%' THEN 'BROKE' ELSE ")
        '.AppendLine("CASE WHEN UD.unitrecom = 0 THEN 'OUT' ELSE UD.status END END END) AS transtype, ")
        '.AppendLine("(CASE WHEN UD.basedname LIKE '%USING%' THEN UD.basedname ELSE UD.location END) AS location, ")
        '.AppendLine("LTRIM(RTRIM(UD.unitcode)) AS unitcode, UD.inci_id, UD.primeoffc, LTRIM(RTRIM(UD.statbeat)) AS statbeat, A1.geox, A1.geoy, A1.timestamp, A1.heading, A1.speed, ")
        '.AppendLine("(CASE WHEN UN.groupcode IN ('HELO', 'MUTAID') THEN 'MUTAID' ELSE CASE LEFT(UD.unitcode, 3) WHEN 'VFM' THEN 'MEL' ")
        '.AppendLine("WHEN 'VBR' THEN 'BRAD' WHEN 'VFB' THEN 'BRAD' WHEN 'VUT' THEN 'OTHER' ELSE CASE LEFT(UD.unitcode, 2) WHEN 'VE' THEN 'SPARE' ")
        '.AppendLine("WHEN 'VO' THEN 'BC' WHEN 'VP' THEN 'PUT' WHEN 'UT' THEN 'OTHER' WHEN 'VW' THEN 'WOODS' WHEN 'PU' THEN 'PUT' ")
        '.AppendLine("WHEN 'TJ' THEN 'JAX' WHEN 'HR' THEN 'OTHER' WHEN 'FJ' THEN 'JAX' WHEN 'LJ' THEN 'JAX' WHEN 'RJ' THEN 'JAX' ")
        '.AppendLine("WHEN 'RS' THEN 'STJ' WHEN 'FS' THEN 'STJ' WHEN 'FN' THEN 'NAS' WHEN 'VA' THEN 'AIR' WHEN 'LN' THEN 'NAS' WHEN 'LO' THEN 'OTHER' ")
        '.AppendLine("WHEN 'FF' THEN 'PUT' WHEN 'RP' THEN 'PUT' WHEN 'FG' THEN 'PUT' WHEN 'FM' THEN 'PUT' WHEN 'RM' THEN 'PUT' ")
        '.AppendLine("WHEN 'BR' THEN 'BRAD' WHEN 'FB' THEN 'BRAD' WHEN 'RB' THEN 'BRAD' ELSE ")
        '.AppendLine("CASE UD.unitcode WHEN 'R1' THEN 'SPARE' WHEN 'R2' THEN 'SPARE' WHEN 'E192' THEN 'SPARE' WHEN 'COM5' THEN 'BC' ")
        '.AppendLine("WHEN 'R3' THEN 'SPARE' WHEN 'R5' THEN 'SPARE' WHEN 'R8' THEN 'SPARE' WHEN 'SPADM1' THEN 'SPARE' ELSE ")
        '.AppendLine("CASE LEFT(UD.unitcode, 1) WHEN 'J' THEN 'JAX' ")
        '.AppendLine("WHEN 'W' THEN 'WOODS' WHEN 'S' THEN 'STJ' WHEN 'N' THEN 'NAS' WHEN 'A' THEN 'AIR' ")
        '.AppendLine("ELSE UN.kind END END END END END) AS kind FROM undisp UD INNER JOIN unit UN ON UD.unitcode=UN.unitcode ")
        '.AppendLine("LEFT OUTER JOIN vwMaxAvllogidByUnit A1 ON LTRIM(RTRIM(UD.unitcode)) = LTRIM(RTRIM(A1.unitcode))) AS AA")
        '.AppendLine("LEFT OUTER JOIN Tracking.dbo.unit_tracking_data UTD ON AA.unitcode = UTD.unitcode")
        '.AppendLine("WHERE AA.unitcode NOT IN ('DISP', 'ACDAY', 'OPEN', 'VE261', 'E201')")
        .AppendLine("SELECT * FROM vwMinicadUnitKindAndStatus ")
        .AppendLine("ORDER BY kind ASC, unitcode ASC")
      End With
      Dim DS As DataSet = D.Get_Dataset(sbQuery.ToString)
      Try
        Dim L As New List(Of ActiveUnit)(From dbRow In DS.Tables(0).AsEnumerable()
                                         Select GetActiveUnitsByDataRow(dbRow, StaffList))
        Return L
      Catch ex As Exception
        Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    'Public Function GetShortActiveUnitLocation() As List(Of UnitTracking)
    '  ' This is used for active calls and for the overall unit status data
    '  Dim D As New Tools.DB(CS, AppID, ErrorHandling)
    '  Dim sbQuery As New StringBuilder
    '  With sbQuery ' UD.avstatus IN ('OUT', 'EQ') 
    '    .AppendLine("SELECT A1.unitcode, A1.geox, A1.geoy, A1.timestamp, A1.heading, A1.speed, A1.inci_id, ISNULL(UPPER(UD.location), '') AS location, ")
    '    .AppendLine("(CASE WHEN UD.unitrecom = 0 THEN 'OUT' ELSE ISNULL(UD.status, '') END) AS transtype, LTRIM(RTRIM(ISNULL(UD.statbeat, ''))) AS statbeat, ")
    '    .AppendLine("(CASE WHEN UN.groupcode IN ('HELO', 'MUTAID') THEN 'MUTAID' ELSE CASE LEFT(LTRIM(RTRIM(UD.unitcode)), 2) WHEN 'VO' THEN 'BC' ")
    '    .AppendLine("WHEN 'PU' THEN 'PUT' WHEN 'TJ' THEN 'JAX' WHEN 'HR' THEN 'HAZ' WHEN 'FJ' THEN 'JAX' WHEN 'LJ' THEN 'JAX' ")
    '    .AppendLine("WHEN 'RJ' THEN 'JAX' WHEN 'RS' THEN 'STJ' WHEN 'FS' THEN 'STJ' WHEN 'FN' THEN 'NAS' WHEN 'LO' THEN 'OTHER' ")
    '    .AppendLine("WHEN 'LN' THEN 'NAS' WHEN 'FF' THEN 'PUT' WHEN 'RP' THEN 'PUT' WHEN 'FG' THEN 'PUT' ")
    '    .AppendLine("WHEN 'FM' THEN 'PUT' WHEN 'RM' THEN 'PUT' WHEN 'BR' THEN 'BRAD' WHEN 'FB' THEN 'BRAD'")
    '    .AppendLine("WHEN 'RB' THEN 'BRAD' ELSE CASE LEFT(UD.unitcode, 1) WHEN 'J' THEN 'JAX' WHEN 'W' THEN 'WOODS' ")
    '    .AppendLine("WHEN 'S' THEN 'STJ' WHEN 'N' THEN 'NAS' WHEN 'A' THEN 'AIR' ELSE UN.kind END END END) AS kind ")
    '    .AppendLine("FROM avllog A1  LEFT OUTER JOIN undisp UD ON LTRIM(RTRIM(UD.inci_id))=LTRIM(RTRIM(A1.inci_id)) AND LTRIM(RTRIM(UD.unitcode)) = LTRIM(RTRIM(A1.unitcode))")
    '    .AppendLine("LEFT OUTER JOIN unit UN ON LTRIM(RTRIM(A1.unitcode))=LTRIM(RTRIM(UN.unitcode)) INNER JOIN (SELECT MAX(timestamp) AS timestamp, unitcode FROM avllog ")
    '    .AppendLine("WHERE timestamp > DATEADD(dd, -1, GETDATE()) AND unitcode IN (SELECT distinct unitcode FROM avllog WHERE timestamp > DATEADD(dd, -1, GETDATE())) ")
    '    .AppendLine("GROUP BY unitcode) A2 ON A1.timestamp = A2.timestamp AND A1.unitcode = A2.unitcode")

    '  End With
    '  Dim DS As DataSet = D.Get_Dataset(sbQuery.ToString)
    '  Try
    '    Dim L As New List(Of UnitTracking)(From dr In DS.Tables(0).AsEnumerable() Select New UnitTracking With {
    '                      .IncidentID = dr("inci_id").ToString.Trim, .District = dr("statbeat"), .GeoX = dr("geox"), .GeoY = dr("geoy"),
    '                      .Heading = dr("heading"), .Speed = dr("speed"), .Location = dr("location").ToString.Trim, .Timestamp = dr("timestamp"),
    '                      .UnitName = dr("unitcode").ToString.Trim, .UnitStatus = ConvertStatus(dr("transtype").ToString.Trim), .UnitType = dr("kind").ToString.Trim})
    '    Return L
    '  Catch ex As Exception
    '    Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
    '    Return Nothing
    '  End Try
    'End Function

    '    Public Function GetAllHistoricalCallsByAddressForActiveCalls() As List(Of CaDCall)
    '      ' This function will be used on the active calls table to view any previous calls at that
    '      ' street address.  I want to load this data as a subtable to the regular data row and do it on click
    '      Dim D As New Tools.DB(CAD, AppID, ErrorHandling)
    '      'Dim au As List(Of ActiveUnit) = GetUnitStatus()
    '      Dim query As String = "
    'SELECT
    '  NULL AS latitude
    '  ,NULL AS longitude
    '  ,NULL AS confidence
    '  ,NULL AS proctime
    '  ,IM.business
    '  ,IM.crossroad1
    '  ,IM.geox
    '  ,IM.geoy
    '  ,IM.inci_id
    '  ,IM.nature
    '  ,IM.calltime
    '  ,( CASE
    '       WHEN PATINDEX('%IST:%'
    '                     ,IM.addtst) > 0
    '       THEN LTRIM(RTRIM(IM.street))
    '       WHEN LEN(LTRIM(RTRIM(IM.addtst))) = 0
    '       THEN LTRIM(RTRIM(IM.street))
    '       ELSE LTRIM(RTRIM(IM.street)) + ' - ' + IM.addtst
    '     END ) AS fullstreet
    '  ,LTRIM(RTRIM(IM.street)) AS street
    '  --,ISNULL(LTRIM(RTRIM(notes)), '') notes
    '  ,IM.district
    '  ,IM.case_id
    '  ,LTRIM(RTRIM(IM.street)) + ', '
    '   + LTRIM(RTRIM(IM.citydesc)) + ' FL, '
    '   + LTRIM(RTRIM(IM.zip)) AS mapurl
    '   ,ISNULL(NMD.call_type, 'EMS') CallType
    '   ,ISNULL(NMD.is_emergency, 1) IsEmergency
    'FROM
    '  inmain IM 
    '  INNER JOIN incident I ON IM.street = I.street AND I.cancelled=0 AND I.inci_id != ''
    '  LEFT OUTER JOIN cad.dbo.nature N ON IM.naturecode = N.naturecode
    '  LEFT OUTER JOIN Tracking.dbo.naturecode_meta_data NMD ON N.natureid = NMD.natureid
    'WHERE
    '  IM.cancelled = 0
    '  AND IM.inci_id <> ''
    'ORDER  BY
    '  inci_id DESC
    '  ,calltime DESC "
    '      ' 08/22/2021 removed old query replaced with new one that had a few more fields.
    '      'Dim sbQuery As New StringBuilder
    '      'With sbQuery ' 6/3/2014, restricted results to the top 20.
    '      '  .AppendLine("SELECT NULL as latitude, NULL as longitude, geox, geoy, business, crossroad1, inci_id, nature, calltime, ")
    '      '  .AppendLine("(CASE WHEN PATINDEX('%IST:%',addtst) > 0 THEN LTRIM(RTRIM(street)) ")
    '      '  .AppendLine("WHEN LEN(LTRIM(RTRIM(addtst))) = 0 THEN LTRIM(RTRIM(street)) ")
    '      '  .AppendLine("ELSE LTRIM(RTRIM(street)) + ' - ' + addtst END) AS fullstreet, LTRIM(RTRIM(street)) as street, notes, district, case_id, ")
    '      '  .AppendLine("LTRIM(RTRIM(street)) + ', ' + LTRIM(RTRIM(citydesc)) + ' FL, ' + LTRIM(RTRIM(zip)) AS mapurl")
    '      '  .AppendLine("FROM inmain WHERE cancelled=0 AND inci_id <> '' ")
    '      '  .AppendLine("AND street IN (SELECT street FROM incident WHERE cancelled=0 AND inci_id <> '') ORDER BY inci_id DESC, calltime DESC ")
    '      'End With
    '      Try
    '        Dim DS As DataSet = D.Get_Dataset(query, "CAD")
    '        Dim L As New List(Of CaDCall)(From dbRow In DS.Tables(0).AsEnumerable() Select GetCallByDataRow(dbRow, Nothing))
    '        Return L
    '      Catch ex As Exception
    '        Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
    '        Return Nothing
    '      End Try
    '    End Function

    '    Public Function GetHistoricalCallsByAddressForHistoricalCall(ByVal IncidentID As String) As List(Of CaDCall)
    '      ' This function will be used on the active calls table to view any previous calls at that
    '      ' street address.  I want to load this data as a subtable to the regular data row and do it on click
    '      Dim D As New Tools.DB(CAD, AppID, ErrorHandling)
    '      'Dim au As List(Of ActiveUnit) = GetUnitStatus()
    '      Dim sbQuery As New StringBuilder
    '      With sbQuery ' 6/3/2014, restricted results to the top 20.
    '        .AppendLine("SELECT NULL as latitude, NULL as longitude, geox, geoy, business, crossroad1, inci_id, nature, calltime, ")
    '        .AppendLine("(CASE WHEN PATINDEX('%IST:%',addtst) > 0 THEN LTRIM(RTRIM(street)) ")
    '        .AppendLine("WHEN LEN(LTRIM(RTRIM(addtst))) = 0 THEN LTRIM(RTRIM(street)) ")
    '        .AppendLine("ELSE LTRIM(RTRIM(street)) + ' - ' + addtst END) AS fullstreet, LTRIM(RTRIM(street)) as street, notes, district, case_id, ")
    '        .AppendLine("LTRIM(RTRIM(street)) + ', ' + LTRIM(RTRIM(citydesc)) + ' FL, ' + LTRIM(RTRIM(zip)) AS mapurl")
    '        .Append("FROM inmain WHERE cancelled=0 AND inci_id <> '' AND inci_id <> '").Append(IncidentID).Append("'")
    '        .Append("AND street IN (SELECT street FROM inmain WHERE cancelled=0 AND inci_id = '").Append(IncidentID)
    '        .Append("') ORDER BY inci_id DESC, calltime DESC ")
    '      End With
    '      Try
    '        Dim DS As DataSet = D.Get_Dataset(sbQuery.ToString, "CAD")
    '        Dim L As New List(Of CaDCall)(From dbRow In DS.Tables(0).AsEnumerable() Select GetCallByDataRow(dbRow, Nothing))
    '        Return L
    '      Catch ex As Exception
    '        Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
    '        Return Nothing
    '      End Try
    '    End Function

    Public Function GetAllActiveCallsDetail() As List(Of CallDetail)
      ' This will be used when they click on an Inci_id on the Active call or Historical call list
      ' This will pull a list of all of the incilog data for a particular inci_id
      'Dim D As New Tools.DB(CAD, AppID, ErrorHandling)
      Dim query As String = "
SELECT
  L.logid LogID
  ,LTRIM(RTRIM(L.inci_id)) IncidentID
  ,LTRIM(RTRIM(userid)) UserID
  ,LTRIM(RTRIM(descript)) Description
  ,timestamp Timestamp
  ,LTRIM(RTRIM(comments)) Comments
  ,LTRIM(RTRIM(usertyped)) UserTyped
  ,LTRIM(RTRIM(unitcode)) Unit
FROM
  log L
WHERE
  inci_id IN
  (SELECT
     inci_id
   FROM
     incident
   WHERE
    inci_id <> ''
    AND cancelled = 0)
ORDER  BY
  timestamp DESC"
      Dim C As New CADData()
      Return C.Get_Data(Of CallDetail)(query, C.CAD)
      'Dim sbQuery As New StringBuilder
      'With sbQuery
      '  .AppendLine("SELECT inci_id, userid, descript, timestamp, comments, usertyped, unitcode FROM log ")
      '  .Append("WHERE inci_id IN (SELECT inci_id FROM incident WHERE inci_id<>'' AND cancelled=0) ORDER BY timestamp DESC ")
      'End With

      'Dim DS As DataSet = D.Get_Dataset(query)
      'Try
      '  Dim L As New List(Of CADCallDetail)(From dbRow In DS.Tables(0).AsEnumerable() Select GetCallDetailByDataRow(dbRow))
      '  Return L
      'Catch ex As Exception
      '  Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      '  Return Nothing
      'End Try
    End Function

    Public Function GetAllCallsDetail() As List(Of CallDetail)
      ' This will be used when they click on an Inci_id on the Active call or Historical call list
      ' This will pull a list of all of the incilog data for a particular inci_id
      Dim query As String = "
SELECT
  L.incilogid LogID
  ,LTRIM(RTRIM(L.inci_id)) IncidentID
  ,LTRIM(RTRIM(userid)) UserID
  ,LTRIM(RTRIM(descript)) Description
  ,timestamp Timestamp
  ,LTRIM(RTRIM(comments)) Comments
  ,LTRIM(RTRIM(usertyped)) UserTyped
  ,LTRIM(RTRIM(unitcode)) Unit
FROM
  incilog L
WHERE
  inci_id IN
  (SELECT
     inci_id
   FROM
     inmain
   WHERE
    inci_id <> ''
    AND cancelled = 0
    AND calltime > DATEADD(dd, -7, CAST(GETDATE() AS DATE)))
ORDER  BY
  timestamp DESC"
      Dim C As New CADData()
      Return C.Get_Data(Of CallDetail)(query, C.CAD)

      'Dim D As New Tools.DB(CAD, AppID, ErrorHandling)
      'Dim sbQuery As New StringBuilder
      'With sbQuery
      '  .AppendLine("SELECT inci_id, userid, descript, timestamp, comments, usertyped, unitcode FROM incilog ")
      '  .Append("WHERE inci_id IN (SELECT inci_id FROM inmain WHERE inci_id<>'' AND cancelled=0) ")
      '  .Append("AND timestamp > '").Append(Today.AddDays(-5).ToShortDateString)
      '  .Append(" 12:00:00 AM' ORDER BY timestamp DESC ")
      'End With
      'Dim DS As DataSet = D.Get_Dataset(sbQuery.ToString)
      'Try
      '  Dim L As New List(Of CADCallDetail)(From dbRow In DS.Tables(0).AsEnumerable() Select GetCallDetailByDataRow(dbRow))
      '  Return L
      'Catch ex As Exception
      '  Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      '  Return Nothing
      'End Try
    End Function

    Public Function GetCallDetail(IncidentID As String, Timestamp As Date) As List(Of CallDetail)
      ' This will be used when they click on an Inci_id on the Active call or Historical call list
      ' This will pull a list of all of the incilog data for a particular inci_id
      'Dim D As New Tools.DB(CAD, AppID, ErrorHandling)
      'Dim sbQuery As New StringBuilder
      'With sbQuery
      '  .AppendLine("SELECT inci_id, userid, descript, timestamp, comments, usertyped, unitcode FROM incilog ")
      '  .Append("WHERE inci_id='").Append(IncidentID).Append("' ORDER BY timestamp DESC ")
      'End With
      Dim dp As New DynamicParameters()
      dp.Add("@IncidentID", IncidentID)
      If Timestamp.Year = 1 Then
        dp.Add("@Timestamp", Nothing)
      Else
        dp.Add("@Timestamp", Timestamp)
      End If


      Dim query As String = "
SELECT
  incilogid LogID
  ,LTRIM(RTRIM(inci_id)) IncidentID
  ,LTRIM(RTRIM(userid)) UserID
  ,LTRIM(RTRIM(descript)) Description
  ,timestamp Timestamp
  ,LTRIM(RTRIM(comments)) Comments
  ,LTRIM(RTRIM(usertyped)) UserTyped
  ,LTRIM(RTRIM(unitcode)) Unit
FROM
  incilog
WHERE
  inci_id = @IncidentID
  AND transtype NOT IN ('ARM', 'EVT')
  

UNION

SELECT
  logid LogID
  ,LTRIM(RTRIM(inci_id)) IncidentID
  ,LTRIM(RTRIM(userid)) UserID
  ,LTRIM(RTRIM(descript)) Description
  ,timestamp Timestamp
  ,LTRIM(RTRIM(comments)) Comments
  ,LTRIM(RTRIM(usertyped)) UserTyped
  ,LTRIM(RTRIM(unitcode)) Unit
FROM
  log
WHERE
  inci_id = @IncidentID
AND transtype NOT IN ('ARM', 'EVT')
ORDER  BY
  timestamp DESC 
"
      'Dim DS As DataSet = D.Get_Dataset(sbQuery.ToString)
      Dim C As New CADData()
      Dim calldetail = C.Get_Data(Of CallDetail)(query, dp, C.CAD)
      Dim calldetailnotes = Note.GetCachedNotesToCallDetail()
      calldetail.AddRange(From cdn In calldetailnotes
                          Where cdn.IncidentID = IncidentID
                          Select cdn)
      Return (From cd In calldetail Order By cd.Timestamp Descending Select cd).ToList
      'Try
      '  Dim L As New List(Of CADCallDetail)(From dbRow In DS.Tables(0).AsEnumerable() Select GetCallDetailByDataRow(dbRow))
      '  Return L
      'Catch ex As Exception
      '  Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      '  Return Nothing
      'End Try
    End Function

    'Private Function UpdateIncidentNotesWithCallDetail(ByRef AD As List(Of CADCallDetail), Notes As String, IncidentID As String) As List(Of CADCallDetail)
    '  Try
    '    ' This function is going to pull out a specific Incident ID's call detail and format and add the call's notes into it.
    '    Dim sNotes() As String = Notes.Split(New String() {"]" & vbCrLf}, StringSplitOptions.None)
    '    For a As Integer = sNotes.GetLowerBound(0) To sNotes.GetUpperBound(0)
    '      If sNotes(a).Trim.Length > 0 Then
    '        Dim detail() As String = sNotes(a).Split(New String() {"  ["}, StringSplitOptions.None)
    '        If detail(0).Trim <> "CCFR" Then
    '          Dim raw() As String = detail(1).Split(" ")
    '          Dim x As New CADCallDetail
    '          x.Comments = detail(0).Trim
    '          x.UserTyped = x.Comments.Trim
    '          x.UserID = raw(2).Trim
    '          x.Timestamp = CType(raw(0) & " " & raw(1), Date)
    '          x.IncidentID = IncidentID
    '          x.Description = "NOTE"
    '          AD.Add(x)
    '        End If
    '      End If
    '    Next
    '    Dim tmpA As New List(Of CADCallDetail)
    '    For Each a In AD
    '      If a.Description.Contains("}") Then
    '        Dim x As New CADCallDetail
    '        x.Comments = a.Description.Substring(a.Description.IndexOf("}") + 1).Trim
    '        x.Unit = a.Unit
    '        x.Description = "MISC. RADIO"
    '        x.Timestamp = a.Timestamp
    '        x.UserID = a.UserID
    '        x.UserTyped = a.UserTyped.Trim
    '        x.IncidentID = a.IncidentID
    '        tmpA.Add(x)
    '      End If
    '    Next
    '    If tmpA.Count > 0 Then AD.AddRange(tmpA)
    '    Dim ignore() As String = {"MOBILE COMPUTER CHANGE", "MILEAGE"}
    '    Dim only() As String = {"MISC. RADIO", "NOTE"}
    '    'a.Description.Trim.ToUpper = "MISC. RADIO" _
    '    Dim adl = (From a In AD Where a.IncidentID = IncidentID And only.Contains(a.Description.Trim.ToUpper) _
    '              And Not a.UserTyped.Trim.ToUpper.Contains(ignore(0)) And Not a.UserTyped.Trim.ToUpper.Contains(ignore(1))
    '               Order By a.Timestamp Descending Select a).ToList
    '    Return adl
    '  Catch ex As Exception
    '    Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
    '    Return Nothing
    '  End Try
    'End Function



    Private Function GetActiveUnitsByDataRow(dr As DataRow, sl As List(Of Telestaff_Staff)) As ActiveUnit
      Dim a As New ActiveUnit
      Try
        With a
          Dim avcomments = CType(dr("avcomments"), String).Trim
          .IncidentID = CType(dr("inci_id"), String).Trim
          .UnitName = CType(dr("unitcode"), String).Trim
          .District = CType(dr("statbeat"), String).Trim
          .UnitStatus = ConvertStatus(dr("transtype"))
          .UnitType = CType(dr("kind"), String).Trim
          .HomeStation = dr("homestbt").ToString.Trim
          ' The purpose of this next bit of code is to identify when a unit is available but out of their home district.

          If .District.Length > 1 AndAlso .HomeStation.Length > 0 AndAlso
            .UnitStatus = "Available" AndAlso .District <> .HomeStation Then .UnitStatus = "Available-Out-of-District"

          If .UnitName.Length > 5 AndAlso .UnitName.ToUpper.Substring(0, 5) = "CHIEF" Then .PrimeOfficer = CType(dr("primeoffc"), String).Trim Else .PrimeOfficer = "NONE"
          Select Case .UnitType
            Case "BC"
              .PrimeOfficer = CType(dr("primeoffc"), String).Trim
          End Select
          If .PrimeOfficer.Length = 0 Then .PrimeOfficer = "NONE"
          .Location = dr("location").ToString.Trim.Replace("To:", "")
          .Timestamp = Date.MinValue
          .LocationType = ""
          .GeoX = 0
          .GeoY = 0
          .Latitude = 0
          .Longitude = 0
          .Speed = 0
          .Heading = 0
          If .Location.IndexOf("USING") = -1 Then
            If IsDBNull(dr("timestamp")) Then
              ' If we don't have a timestamp, we should see if we have lat/long data from the UTD table.
              If Not IsDBNull(dr("date_last_communicated")) AndAlso dr("latitude") <> 0 Then
                .LocationType = "AVL"
                .Timestamp = dr("date_last_communicated")
                .Latitude = dr("latitude")
                .Longitude = dr("longitude")
                Dim p As Point = Convert_LatLong_To_SP(.Latitude, .Longitude)
                .GeoX = p.X
                .GeoY = p.Y
              End If
            Else
              ' Here we'll make a determination, if the datelastcommunicated is greater than the timestamp, we'll use that.
              If Not IsDBNull(dr("date_last_communicated")) AndAlso dr("date_last_communicated") > dr("timestamp") AndAlso dr("latitude") <> 0 Then
                .Timestamp = dr("date_last_communicated")
                .LocationType = "AVL"
                .Latitude = dr("latitude")
                .Longitude = dr("longitude")
                Dim p As Point = Convert_LatLong_To_SP(.Latitude, .Longitude)
                .GeoX = p.X
                .GeoY = p.Y
                .Speed = dr("speed")
                .Heading = dr("heading")
              Else
                .Timestamp = dr("timestamp")
                .LocationType = "CAD"
                .GeoX = dr("geox")
                .GeoY = dr("geoy")
                Dim ll As LatLong = Convert_SP_To_LatLong(.GeoX, .GeoY)
                .Latitude = ll.Latitude
                .Longitude = ll.Longitude
                .Speed = dr("speed")
                .Heading = dr("heading")
              End If
            End If
          End If
          If avcomments.ToUpper.IndexOf("OFFLINE") > -1 And (.UnitType = "BC" Or .UnitName = "SWAT") Then
            .GeoX = 0
            .GeoY = 0
            .Latitude = 0
            .Longitude = 0
            .Speed = 0
            .Heading = 0
          End If
          .Staff = (From s In sl Where .UnitName = s.Unit Order By s.ListOrder Ascending Select s.Staff).ToList
        End With
        Return a
      Catch ex As Exception
        Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Private Function GetUnitsByDataRow(dr As DataRow) As ActiveUnit
      Dim a As New ActiveUnit
      Try
        With a
          .Location = ""
          .PrimeOfficer = ""
          .District = ""
          .GeoY = 0
          .GeoX = 0
          .Speed = 0
          .Heading = 0
          .Timestamp = Date.MinValue
          .IncidentID = CType(dr("inci_id"), String).Trim
          .UnitName = CType(dr("unitcode"), String).Trim
          .UnitStatus = ConvertStatus(dr("transtype"))
          .UnitType = CType(dr("kind"), String).Trim
        End With
        Return a
      Catch ex As Exception
        Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Private Function GetCallDetailByDataRow(dr As DataRow) As CallDetail
      Dim a As New CallDetail
      Try
        With a
          .LogID = dr("logid")
          .IncidentID = dr("inci_id").ToString.Trim
          .UserID = CType(dr("userid"), String).Trim
          .Description = CType(dr("descript"), String).Trim
          .Timestamp = CType(dr("timestamp"), DateTime)
          .Comments = CType(dr("comments"), String).Trim
          .UserTyped = CType(dr("usertyped"), String).Trim
          .Unit = dr("unitcode").ToString.Trim
        End With
        Return a
      Catch ex As Exception
        Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Private Function ConvertStatus(Status As String) As String
      Select Case Status.Trim.ToUpper
        Case "A"
          Return "Arrived"
        Case "C"
          Return "Cleared"
        Case "X"
          Return "Cancelled"
        Case "D"
          Return "Dispatched"
        Case "E"
          Return "En-Route"
        Case "H"
          Return "Hospital"
        Case "T"
          Return "Transport"
        Case "BROKE"
          Return "Broke"
        Case "SWAP"
          Return "Vehicle-Swap"
        Case "OUT", "EQ", "MUAD", "PERS", "STBY"
          Return "Out-of-Service"
        Case ""
          Return "Available"
        Case Else
          Return Status.Trim
      End Select
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
      Dim ftd As New Full_Tracking_Data
      ftd.GroupName = td.GroupName
      ftd.IPAddress = IPAddress
      ftd.Latitude = td.Latitude
      ftd.Longitude = td.Longitude
      ftd.Accuracy = td.Accuracy
      ftd.Altitude = td.Altitude
      ftd.AltitudeAccuracy = td.AltitudeAccuracy
      ftd.Heading = td.Heading
      ftd.Speed = td.Speed
      ftd.User_Date = td.User_Date
      ftd.UserAgent = UserAgent
      ftd.UserID = td.UserID
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

