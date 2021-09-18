Imports Dapper

Namespace Models


  Public Class CallDetail
    ' This class will contain the incilog detail data for a particular inci_id, it will be populated
    ' when the user clicks on the inci_id.
    Public Property LogID As Long ' The primary key of the row.  This field is the logid in the log table, and the incilogid in the incilog table.
    Public Property NoteID As Long = 0 ' If this detail object was created from a note, this will be the ID of that note.
    Public Property IncidentID As String ' The incidentID for the call
    Public Property UserID As String ' The userid field in incilog
    Public Property Unit As String ' The Unit's code identifier.
    Public Property Description As String ' The descript field in incilog
    Public Property Timestamp As DateTime ' The timestamp field in incilog, the time when something happened
    Public ReadOnly Property FormattedTimestamp As String
      Get
        'Return Timestamp.Month.ToString & "/" & Timestamp.Day.ToString & " " & Timestamp.ToShortTimeString
        Return Timestamp.ToString
      End Get
    End Property
    Public Property Comments As String ' Various text from incilog table 
    Public Property UserTyped As String ' usertyped field from incilog


    Public Shared Function GetAllActiveCallsDetail() As List(Of CallDetail)
      ' This will be used when they click on an Inci_id on the Active call or Historical call list
      ' This will pull a list of all of the incilog data for a particular inci_id
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

    End Function

    Public Shared Function GetAllCallsDetail() As List(Of CallDetail)
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
    End Function

    Public Shared Function GetCallDetail(IncidentID As String, Timestamp As Date) As List(Of CallDetail)
      ' This will be used when they click on an Inci_id on the Active call or Historical call list
      ' This will pull a list of all of the incilog data for a particular inci_id

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
  timestamp DESC "
      Dim C As New CADData()
      Dim calldetail = C.Get_Data(Of CallDetail)(query, dp, C.CAD)
      Dim calldetailnotes = Note.GetCachedNotesToCallDetail()
      calldetail.AddRange(From cdn In calldetailnotes
                          Where cdn.IncidentID = IncidentID
                          Select cdn)
      Return (From cd In calldetail Order By cd.Timestamp Descending Select cd).ToList

    End Function


  End Class

End Namespace
