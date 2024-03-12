Imports System.Environment

Namespace Models
  Public Class ActiveUnit
    Public Property UnitName As String ' The unit designation name
    Public Property UnitStatus As String ' The unit's current status.  This will be blank unless they are assigned to something.
    Public Property UnitType As String ' The kind of unit, ie: Tanker, rescue, Engine, Ladder, etc.
    Public Property IncidentID As String ' The inci_id this unit is assigned to.  This will be empty for most active units
    Public Property Transtype As String
    Public Property District As String = "" ' This is the unit's current assigned geographic area.
    Public Property HomeStation As String = "" ' The unit's home station
    Public Property PrimeOfficer As String ' This is the primary officer in charge of the unit.
    Public Property Location As String ' If there is a location set, it'll show it.
    Public Property Staff As List(Of String)
    Public Property GeoX As Double
    Public Property GeoY As Double
    Public Property Latitude As Double
    Public Property Longitude As Double
    Public Property Timestamp As Date = Date.MinValue
    Public Property Speed As Double
    Public Property Heading As Double
    Public Property LocationType As String = ""
    Public Property is_primary_unit As Boolean = False
    Public Property show_in_minicad As Boolean = False
    Public ReadOnly Property LocationStatus As String
      Get
        If Timestamp = Date.MinValue Then
          Return ""
        Else
          Select Case Now.Subtract(Timestamp).TotalMinutes
            Case Is < 11 ' 10 minutes / Green
              'Return "//static.arcgis.com/images/Symbols/Basic/GreenBeacon.png"
              Return "//static.arcgis.com/images/Symbols/Shapes/GreenSquareLargeB.png"
            Case Is < 241 ' 4 hours / Yellow
              'Return "//static.arcgis.com/images/Symbols/Basic/AmberBeacon.png"
              Return "//static.arcgis.com/images/Symbols/Shapes/YellowSquareLargeB.png"
            Case Is < 721 ' 12 hours / Orange
              'Return "//static.arcgis.com/images/Symbols/Basic/OrangeBeacon.png"
              Return "//static.arcgis.com/images/Symbols/Shapes/OrangeSquareLargeB.png"
            Case Is < 1441 ' 24 hours / Red
              'Return "//static.arcgis.com/images/Symbols/Basic/RedBeacon.png"
              Return "//static.arcgis.com/images/Symbols/Shapes/RedSquareLargeB.png"
            Case Else ' < 20160 ' 2 weeks / Black
              'Return "//static.arcgis.com/images/Symbols/Basic/BlackBeacon.png"
              Return "//static.arcgis.com/images/Symbols/Shapes/BlackSquareLargeB.png"
              'Case Else
              '    Return ""
          End Select
        End If
      End Get
    End Property

    Public Shared Function GetUnitStatus() As List(Of ActiveUnit)
      ' This is for historical calls only, this will return a list of units() for a particular inci_id
      Dim c As New CADData()
      Dim d As New Tools.DB(c.CAD, CADData.AppID, CADData.ErrorHandling)
      Dim query As String = "

"
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
        Tools.Log(ex, CADData.AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Public Shared Function GetShortActiveUnitStat(StaffList As List(Of Telestaff_Staff)) As List(Of ActiveUnit)
      ' This is used for active calls and for the overall unit status data
      Dim c As New CADData()
      Dim D As New Tools.DB(c.CAD, CADData.AppID, CADData.ErrorHandling)
      Dim query As String = "
SELECT
  homestbt
  ,transtype
  ,location
  ,avcomments
  ,unitcode
  ,inci_id
  ,primeoffc
  ,statbeat
  ,geox
  ,geoy
  ,timestamp
  ,heading
  ,speed
  ,kind
  ,longitude
  ,latitude
  ,date_last_communicated
  ,data_source
  ,is_primary_unit
  ,show_in_minicad
FROM
  cad.dbo.vwMinicadUnitKindAndStatus
ORDER  BY  
  kind ASC
  ,unitcode ASC"
      Dim DS As DataSet = D.Get_Dataset(query)
      Try
        Dim L As New List(Of ActiveUnit)(From dbRow In DS.Tables(0).AsEnumerable()
                                         Select GetActiveUnitsByDataRow(dbRow, StaffList))
        Return L
      Catch ex As Exception
        Tools.Log(ex, CADData.AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Public Shared Function GetActiveUnitsByDataRow(dr As DataRow, sl As List(Of Telestaff_Staff)) As ActiveUnit
      Dim c As New CADData()
      Dim a As New ActiveUnit
      Try
        With a
          Dim avcomments = CType(dr("avcomments"), String).Trim
          .IncidentID = CType(dr("inci_id"), String).Trim
          .UnitName = CType(dr("unitcode"), String).Trim
          .District = CType(dr("statbeat"), String).Trim
          .Transtype = CType(dr("transtype"), String).Trim
          '.UnitStatus = ConvertStatus(dr("transtype"))
          .UnitType = CType(dr("kind"), String).Trim
          .HomeStation = dr("homestbt").ToString.Trim
          .is_primary_unit = dr("is_primary_unit")
          .show_in_minicad = dr("show_in_minicad")
          ' The purpose of this next bit of code is to identify when a unit is available but out of their home district.

          'If .District.Length > 1 AndAlso .HomeStation.Length > 0 AndAlso
          '  .UnitStatus = "Available" AndAlso .District <> .HomeStation Then .UnitStatus = "Available-Out-of-District"

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
                .LocationType = dr("data_source") '"AVL"
                .Timestamp = dr("date_last_communicated")
                .Latitude = dr("latitude")
                .Longitude = dr("longitude")
                Dim p As Point = c.Convert_LatLong_To_SP(.Latitude, .Longitude)
                .GeoX = p.X
                .GeoY = p.Y
              End If
            Else
              ' Here we'll make a determination, if the datelastcommunicated is greater than the timestamp, we'll use that.
              If Not IsDBNull(dr("date_last_communicated")) AndAlso dr("date_last_communicated") > dr("timestamp") AndAlso dr("latitude") <> 0 Then
                .Timestamp = dr("date_last_communicated")
                .LocationType = dr("data_source") '"AVL"
                .Latitude = dr("latitude")
                .Longitude = dr("longitude")
                Dim p As Point = c.Convert_LatLong_To_SP(.Latitude, .Longitude)
                .GeoX = p.X
                .GeoY = p.Y
                .Speed = dr("speed")
                .Heading = dr("heading")
              Else
                .Timestamp = dr("timestamp")
                .LocationType = "CAD"
                .GeoX = dr("geox")
                .GeoY = dr("geoy")
                Dim ll As LatLong = c.Convert_SP_To_LatLong(.GeoX, .GeoY)
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
        a.UpdateUnitStatus()
        Return a
      Catch ex As Exception
        Tools.Log(ex, CADData.AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Public Shared Function GetUnitsByDataRow(dr As DataRow) As ActiveUnit
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
          .Transtype = dr("transtype")
          .Timestamp = Date.MinValue
          .IncidentID = CType(dr("inci_id"), String).Trim
          .UnitName = CType(dr("unitcode"), String).Trim
          '.UnitStatus = ConvertStatus(dr("transtype"))
          .UnitType = CType(dr("kind"), String).Trim
        End With
        a.UpdateUnitStatus()
        Return a
      Catch ex As Exception
        Tools.Log(ex, CADData.AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Public Shared Function ConvertStatus(Status As String) As String
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

    Public Sub UpdateUnitStatus()

      Dim status As String = ConvertStatus(Transtype)

      If Transtype.Length = 0 AndAlso ' this is the same as status = "Available"
        District.Length > 1 AndAlso
        HomeStation.Length > 0 AndAlso
        District <> HomeStation Then
        status = "Available-Out-of-District"
      End If
      UnitStatus = status
    End Sub


  End Class
End Namespace

