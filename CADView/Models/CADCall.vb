Imports System.Environment
Imports System.Data
Imports System.Data.SqlClient

Namespace Models
  Public Class CADCall
    ' This is the google maps URL we'll use to build the MapURL property in CAD Call
    'https://maps.google.com/maps?z=20&maptype=satellite&saddr=&daddr=
    Private _callerUSNG As String = "", _callUSNG As String = ""
    Public Property IncidentID As String ' This is the inci_id from CAD
    Public Property NatureCode As String ' The reason for the call
    Public Property Location As String ' The street number and street name and any apartment information
    Public Property Street As String ' a trimmed street field.
    Public Property Addtst As String ' the addendum to the street field, if any.
    Public Property MapURL As String ' This is a calculated field based on the Street address, City, State, and zip code
    Public Property CallTime As DateTime ' The calltime field in CAD
    Public Property CloseTime As DateTime? ' The date the call was closed.  NULL if 
    Public Property District As String ' The district the call is from.
    Public Property IsEmergency As Boolean
    Public Property CallType As String
    Public Property CallIconURLBottom As String = ""
    Public Property CallIconURLTop As String = ""
    Public Property HasRecentVisit As Boolean

    Public ReadOnly Property Age As Integer
      Get
        Return Now.Subtract(CallTime).TotalMinutes
      End Get
    End Property
    Public ReadOnly Property FormattedCallTime As String
      Get
        Return CallTime.Month.ToString & "/" & CallTime.Day.ToString & " " & CallTime.ToShortTimeString
      End Get
    End Property
    Public ReadOnly Property LongCallTime As String
      Get
        Return CallTime.ToString
      End Get
    End Property
    ' Old notes was just the raw string from the notes column in the inmain table
    'Public Property Notes As String = "" ' The notes field in CAD, just text.
    Public Property Notes As New List(Of Note)
    Property CrossStreet As String
    Property BusinessName As String
    Property Units() As List(Of ActiveUnit)
    Property HistoricalCallsByAddress() As List(Of CADCall)
    Property CallDetails() As List(Of CallDetail)
    Public Property GeoX As Double ' geox from CAD
    Public Property GeoY As Double ' geoy from CAD
    Public Property Longitude As Double = 0
    Public Property Latitude As Double = 0
    Public Property Confidence As String = ""
    Public Property LocationTime As Date = Date.MinValue
    Public ReadOnly Property CallerLocationConfidence As String
      Get
        If Confidence.Length = 0 Then Return ""
        Select Case Confidence.Substring(0, 1)
          Case "9"
            Return "High"
          Case "6"
            Return "Medium"
          Case Else
            Return "Unknown"
        End Select
      End Get
    End Property
    Public ReadOnly Property CallerLocationAge As Integer
      Get
        Return Now.Subtract(LocationTime).TotalMinutes
      End Get
    End Property
    Public ReadOnly Property CallLocationUSNG As String
      Get
        If _callUSNG.Length = 0 Then
          Dim x As New CADData
          _callUSNG = x.Convert_SP_To_USNG(GeoX, GeoY)
        End If
        Return _callUSNG
      End Get
    End Property
    ' USNG for the location this call was built to.
    Public Property CallerGeoX As Double = 0
    Public Property CallerGeoY As Double = 0
    Public Property CallerLatitude As Double = 0
    Public Property CallerLongitude As Double = 0
    Public ReadOnly Property CallerLocationUSNG As String
      Get
        If _callerUSNG.Length = 0 AndAlso CallerLatitude <> 0 Then
          Dim x As New CADData
          _callerUSNG = x.Convert_LatLong_To_USNG(CallerLatitude, CallerLongitude)
          '_callerUSNG = x.Convert_SP_To_USNG(CallerGeoX, CallerGeoY)
        End If
        Return _callerUSNG
      End Get
    End Property
    Public Property CCFR As String = ""

    Public Shared Function GetActiveCalls(AU As List(Of ActiveUnit)) As List(Of CADCall)
      ' This function will pull a list of the active calls, and pull a list of 
      ' units assigned to those calls
      ' Basically, anything in the incident table where inci_id <> ''
      ' and any units from the undisp table where inci_id <> ''
      ' Here we get the data from the database.
      Dim c As New CADData
      Dim D As New Tools.DB(c.CAD, CADData.AppID, CADData.ErrorHandling)

      Dim Notes As List(Of Note) = Note.GetCachedNotes()

      Dim query As String = "
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

WITH LastMobileCallers
     AS (SELECT
           phonenum
           ,MAX(anialihsid) lastid
         FROM
           anialihs
         WHERE
          proctime > DATEADD(hh
                             ,-12
                             ,GETDATE())
          AND classser = 'WPH2'
         GROUP  BY
          phonenum)
    ,MobileCallers
     AS (SELECT
           proctime
           ,LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(A.phonenum
                                                        ,'('
                                                        ,'')
                                                ,')'
                                                ,'')
                                        ,' '
                                        ,'')
                                ,'-'
                                ,''))) AS phonenumfixed
           ,LTRIM(RTRIM(latitude)) latitude
           ,LTRIM(RTRIM(longitude)) longitude
           ,LTRIM(RTRIM(confidence)) confidence
         FROM
           anialihs A
           INNER JOIN LastMobileCallers LMC ON A.anialihsid = LMC.lastid)
SELECT
  MC.latitude
  ,MC.longitude
  ,MC.confidence
  ,MC.proctime
  ,geox
  ,geoy
  ,business
  ,crossroad1
  ,I.inci_id
  ,nature
  ,calltime
  ,NULL timeclose
--  ,( CASE
--       WHEN PATINDEX('%IST:%'
--                     ,addtst) > 0
--       THEN LTRIM(RTRIM(street))
--       WHEN LEN(LTRIM(RTRIM(addtst))) = 0
--       THEN LTRIM(RTRIM(street))
--       ELSE LTRIM(RTRIM(street)) + ' - ' + addtst
--     END ) AS fullstreet
  ,LTRIM(RTRIM(street)) AS street
  ,CASE
       WHEN PATINDEX('%IST:%'
                     ,addtst) > 0
       THEN ''
       ELSE LTRIM(RTRIM(addtst))
       END addtst  
  ,district
  ,case_id
  ,LTRIM(RTRIM(street)) + ', '
   + LTRIM(RTRIM(citydesc)) + ' FL, '
   + LTRIM(RTRIM(zip)) AS mapurl
  ,ISNULL(NMD.call_type, 'EMS') CallType
  ,ISNULL(NMD.is_emergency, 1) IsEmergency
  ,ISNULL(MNI.bottom_icon_url, '') NaturecodeIconURLBottom
  ,ISNULL(MNI.top_icon_url, '') NaturecodeIconURLTop
FROM
  incident I
  LEFT OUTER JOIN MobileCallers MC ON I.callerph = MC.phonenumfixed
  LEFT OUTER JOIN cad.dbo.nature N ON I.naturecode = N.naturecode
  LEFT OUTER JOIN Tracking.dbo.naturecode_meta_data NMD ON N.natureid = NMD.natureid
  LEFT OUTER JOIN Tracking.dbo.minicad_naturecode_icons MNI ON NMD.minicad_icon = MNI.id
WHERE
  I.cancelled = 0
  AND I.inci_id <> ''
ORDER  BY
  calltime DESC
  ,I.inci_id DESC "
      Try
        Dim DS As DataSet = D.Get_Dataset(query, "CAD")

        If DS Is Nothing Then Return New List(Of CADCall)

        Dim L As New List(Of CADCall)(From dbRow In DS.Tables(0).AsEnumerable()
                                      Select GetCallByDataRow(dbRow, AU, Notes, True))

        Return L
      Catch ex As Exception
        Tools.Log(ex, CADData.AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Public Shared Function GetHistoricalCalls() As List(Of CADCall)
      ' This function will pull a list of the active calls, and pull a list of 
      ' units assigned to those calls
      ' Basically, anything in the incident table where inci_id <> ''
      ' and any units from the undisp table where inci_id <> ''
      ' Here we get the data from the database.
      Dim c As New CADData
      Dim D As New Tools.DB(c.CAD, CADData.AppID, CADData.ErrorHandling)
      Dim au As List(Of ActiveUnit) = ActiveUnit.GetUnitStatus()
      Dim Notes As List(Of Note) = Note.GetCachedNotes()
      Dim query As String = "
SELECT
  NULL AS latitude
  ,NULL AS longitude
  ,NULL AS confidence
  ,NULL AS proctime
  ,business
  ,crossroad1
  ,geox
  ,geoy
  ,inci_id
  ,nature
  ,calltime
  ,timeclose
--  ,( CASE
--       WHEN PATINDEX('%IST:%'
--                     ,addtst) > 0
--       THEN LTRIM(RTRIM(street))
--       WHEN LEN(LTRIM(RTRIM(addtst))) = 0
--       THEN LTRIM(RTRIM(street))
--       ELSE LTRIM(RTRIM(street)) + ' - ' + addtst
--     END ) AS fullstreet
  ,LTRIM(RTRIM(street)) AS street
  ,CASE
       WHEN PATINDEX('%IST:%'
                     ,addtst) > 0
       THEN ''
       ELSE LTRIM(RTRIM(addtst))
       END addtst  
  ,district
  ,case_id
  ,LTRIM(RTRIM(street)) + ', '
   + LTRIM(RTRIM(citydesc)) + ' FL, '
   + LTRIM(RTRIM(zip)) AS mapurl
   ,ISNULL(NMD.call_type, 'EMS') CallType
   ,ISNULL(NMD.is_emergency, 1) IsEmergency
   ,ISNULL(MNI.bottom_icon_url, '') NaturecodeIconURLBottom
   ,ISNULL(MNI.top_icon_url, '') NaturecodeIconURLTop
FROM
  cad.dbo.inmain I
  LEFT OUTER JOIN cad.dbo.nature N ON I.naturecode = N.naturecode
  LEFT OUTER JOIN Tracking.dbo.naturecode_meta_data NMD ON N.natureid = NMD.natureid
  LEFT OUTER JOIN Tracking.dbo.minicad_naturecode_icons MNI ON NMD.minicad_icon = MNI.id
WHERE
  cancelled = 0
  AND inci_id <> ''
  AND calltime > DATEADD(dd, -7, CAST(GETDATE() AS DATE))
ORDER  BY
  calltime DESC
  ,inci_id DESC "

      ' We also need to get the active units
      Try
        Dim DS As DataSet = D.Get_Dataset(query, "CAD")

        If DS Is Nothing Then Return New List(Of CADCall)

        Dim L As New List(Of CADCall)(From dbRow In DS.Tables(0).AsEnumerable()
                                      Select GetCallByDataRow(dbRow, au, Notes))
        Return L
      Catch ex As Exception
        Tools.Log(ex, CADData.AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Public Shared Function GetCallByDataRow(dr As DataRow,
                                  au As List(Of ActiveUnit),
                                  Notes As List(Of Note),
                                  Optional cache_call_address_history As Boolean = False,
                                  Optional h As List(Of CADCall) = Nothing,
                                  Optional ad As List(Of CallDetail) = Nothing) As CADCall
      Dim cd As New CADData
      Dim c As New CADCall
      If dr Is Nothing Then
        Return c
      End If
      Dim recentstreets = CADData.GetCachedRecentStreets()
      Try
        With c
          .IncidentID = CType(dr("inci_id"), String).Trim
          If cache_call_address_history AndAlso c.IncidentID IsNot Nothing Then
            HistoricalCall.GetCachedHistoricalCallsByIncidentID(c.IncidentID)
          End If
          If Notes IsNot Nothing Then

            .Notes = (From n In Notes
                      Where n.inci_id = c.IncidentID
                      Select n
                      Order By n.timestamp Descending).ToList()
          End If

          .Addtst = dr("addtst").ToString.Trim
          .CCFR = dr("case_id")
          .CallType = dr("CallType")
          .CallIconURLBottom = dr("NaturecodeIconURLBottom")
          .CallIconURLTop = dr("NaturecodeIconURLTop")
          .IsEmergency = dr("IsEmergency")
          .MapURL = CType(dr("mapurl"), String).Trim.Replace("/", "&")
          .CallTime = dr("calltime")
          .CloseTime = IIf(IsDBNull(dr("timeclose")), Nothing, dr("timeclose"))
          .NatureCode = CType(dr("nature"), String).Trim
          .Street = dr("street").ToString.Trim
          .Location = IIf(.Addtst.Length > 0, .Street & " - " & .Addtst, .Street) ' CType(dr("fullstreet"), String).Trim
          .HasRecentVisit = recentstreets.Contains(c.Street)
          .District = CType(dr("district"), String).Trim
          .CrossStreet = dr("crossroad1").ToString.Trim()
          .BusinessName = dr("business").ToString.Trim()
          .GeoX = dr("geox")
          .GeoY = dr("geoy")
          If .GeoX > 0 Then
            Dim ll As LatLong = cd.Convert_SP_To_LatLong(.GeoX, .GeoY)
            .Longitude = ll.Longitude
            .Latitude = ll.Latitude
          Else
            .Latitude = 0
            .Longitude = 0
          End If
          If Not IsDBNull(dr("latitude")) And dr("latitude").ToString.Trim <> "" And IsNumeric(dr("latitude")) And IsNumeric(dr("longitude")) Then
            ' Have to convert this to state plane!
            .CallerLatitude = dr("latitude")
            .CallerLongitude = dr("longitude")
            .LocationTime = dr("proctime")
            .Confidence = dr("confidence").ToString.Trim.Replace(".", "")
            Dim p As Point = cd.Convert_LatLong_To_SP(.CallerLatitude, .CallerLongitude)
            .CallerGeoX = p.X
            .CallerGeoY = p.Y
            '.CallerLocationUSNG = Convert_LatLong_To_USNG(.CallerLatitude, .CallerLongitude)
          End If
          ' Here we should do some sort of test to figure out if we've already inserted the note for the USNG into the notes field.
          'If .Notes.IndexOf("USNG Location") = 0 Then Add_USNG_To_Notes(.IncidentID, .CallLocationUSNG)

          If .District.Length = 0 Then
            If .Age > 1 Then .District = "OOC" Else .District = "?"
          End If
          If au IsNot Nothing Then
            .Units = (From u In au Where u.IncidentID = .IncidentID).ToList()
          End If
        End With
        Return c
      Catch ex As Exception
        Tools.Log(ex, CADData.AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Public Shared Function GetCallByCaseID(CaseID As String) As CADCall
      ' This function will pull a list of the active calls, and pull a list of 
      ' units assigned to those calls
      ' Basically, anything in the incident table where inci_id <> ''
      ' and any units from the undisp table where inci_id <> ''
      ' Here we get the data from the database.
      Dim c As New CADData
      Dim D As New Tools.DB(c.CAD, CADData.AppID, CADData.ErrorHandling)
      'Dim au As List(Of ActiveUnit) = GetUnitStatus()
      'Dim Notes As List(Of Note) = Note.GetCachedNotes()
      'Dim test = (From n In Notes Where n.log_id > 0 Select n).ToList
      'Dim ad As List(Of CADCallDetail) = GetAllCallsDetail()
      Dim query As String = "
SELECT
  NULL AS latitude
  ,NULL AS longitude
  ,NULL AS confidence
  ,NULL AS proctime
  ,business
  ,crossroad1
  ,geox
  ,geoy
  ,inci_id
  ,nature
  ,calltime
  ,timeclose
--  ,CASE
--       WHEN PATINDEX('%IST:%'
--                     ,addtst) > 0
--       THEN LTRIM(RTRIM(street))
--       WHEN LEN(LTRIM(RTRIM(addtst))) = 0
--       THEN LTRIM(RTRIM(street))
--       ELSE LTRIM(RTRIM(street)) + ' - ' + addtst
--     END  fullstreet
  ,LTRIM(RTRIM(street)) AS street
  ,CASE
       WHEN PATINDEX('%IST:%'
                     ,addtst) > 0
       THEN ''
       ELSE LTRIM(RTRIM(addtst))
       END addtst    
  ,district
  ,case_id
  ,LTRIM(RTRIM(street)) + ', '
   + LTRIM(RTRIM(citydesc)) + ' FL, '
   + LTRIM(RTRIM(zip)) AS mapurl
   ,ISNULL(NMD.call_type, 'EMS') CallType
   ,ISNULL(NMD.is_emergency, 1) IsEmergency
   ,ISNULL(MNI.bottom_icon_url, '') NaturecodeIconURLBottom
   ,ISNULL(MNI.top_icon_url, '') NaturecodeIconURLTop
FROM
  cad.dbo.inmain I
  LEFT OUTER JOIN cad.dbo.nature N ON I.naturecode = N.naturecode
  LEFT OUTER JOIN Tracking.dbo.naturecode_meta_data NMD ON N.natureid = NMD.natureid
  LEFT OUTER JOIN Tracking.dbo.minicad_naturecode_icons MNI ON NMD.minicad_icon = MNI.id
WHERE
  case_id=@CaseID
ORDER  BY
  calltime DESC
  ,inci_id DESC 
"

      Try
        Dim au As New List(Of ActiveUnit)
        Dim Notes As New List(Of Note)
        Dim p(0) As SqlParameter
        p(0) = New SqlParameter("@CaseID", Data.SqlDbType.VarChar) With {.Value = CaseID}

        Dim DS As DataSet = D.Get_Dataset(query, "CAD", p)

        If DS Is Nothing Then Return Nothing

        Dim L As New List(Of CADCall)(From dbRow In DS.Tables(0).AsEnumerable()
                                      Select GetCallByDataRow(dbRow, au, Notes))
        If L.Count() > 0 Then
          Return L.First
        End If
        Return Nothing
      Catch ex As Exception
        Tools.Log(ex, CADData.AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

  End Class
End Namespace

