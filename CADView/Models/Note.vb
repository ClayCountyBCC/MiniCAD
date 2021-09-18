Imports Dapper
Imports System.Runtime.Caching
Imports System.Text.RegularExpressions
Imports System.Data
Imports System.Data.SqlClient
Imports System
Imports System.Linq
Imports System.Collections.Generic

Namespace Models


  Public Class Note
    Private Const regex_match As String = "\s+\[\d\d/\d\d/\d+\s\d\d:\d\d:\d\d\s\w+]|\[\w+\-\w+\] {(?<unit>\w+)}\s+"
    Private Const extra_period_match As String = "[\.\,]{2,}"
    Private Const extra_comma_match As String = "\,{2,}"
    Public Property note_id As Integer = 0
    Public Property log_id As Integer = 0
    Public Property timestamp As Date
    Public Property inci_id As String
    Public Property userid As String
    Public Property raw_note As String = ""
    Public ReadOnly Property note
      Get
        Dim matched_note As String = Regex.Replace(raw_note, regex_match, "")
        matched_note = Regex.Replace(matched_note, extra_period_match, ". ")
        matched_note = Regex.Replace(matched_note, extra_comma_match, ", ")
        Return matched_note
      End Get
    End Property
    Public Property raw_unitcode As String = ""
    Public ReadOnly Property unitcode
      Get
        Dim matches = Regex.Matches(raw_note, regex_match)
        If matches.Count() = 0 Then Return ""
        Return matches.Item(0).Groups("unit").Value
      End Get
    End Property
    Public ReadOnly Property formatted_timestamp As String
      Get
        Return timestamp.ToString("MM/dd/yyyy HH:mm:ss")
      End Get
    End Property

    Public Shared Function GetAllNotes()

      Dim query As String = "
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

        DECLARE @StartDate DATE = CAST(DATEADD(DAY, -8, GETDATE()) AS DATE);        

        WITH OpenIncidents AS (

          SELECT
            inci_id
          FROM incident
          WHERE
            inci_id != ''
            AND cancelled = 0

        ), ClosedIncidents AS (

          SELECT
            inci_id
          FROM inmain
          WHERE
            cancelled = 0
            AND CAST(calltime AS DATE) > @StartDate

        ), AllIncidents AS (

          SELECT
            inci_id
          FROM OpenIncidents

          UNION

          SELECT
            inci_id
          FROM ClosedIncidents

        )

        SELECT
          N.id note_id  
          ,0 log_id
          ,N.datetime timestamp
          ,N.eventid inci_id
          ,N.notes raw_note  
          ,'' raw_unitcode
          ,userid          
        FROM cad.dbo.incinotes N
        INNER JOIN AllIncidents I ON N.eventid = I.inci_id

        UNION ALL

        SELECT
          0 note_id
          ,L.logid log_id
          ,L.timestamp
          ,LTRIM(RTRIM(L.inci_id)) inci_id
          ,LTRIM(RTRIM(L.unitcode)) + ' > ' + L.comments raw_note
          ,L.unitcode raw_unitcode
          ,LTRIM(RTRIM(L.userid)) userid
        FROM cad.dbo.log L
        INNER JOIN OpenIncidents I ON L.inci_id = I.inci_id
        WHERE 
          transtype='A'          
          AND LEN(comments) > 0
          AND PATINDEX(';', comments) = 0

        UNION ALL

        SELECT
          0 note_id
          ,L.incilogid log_id
          ,L.timestamp
          ,LTRIM(RTRIM(L.inci_id)) inci_id
          ,LTRIM(RTRIM(L.unitcode)) + ' > ' + L.comments raw_note
          ,L.unitcode raw_unitcode
          ,LTRIM(RTRIM(L.userid)) userid
        FROM cad.dbo.incilog L
        INNER JOIN ClosedIncidents I ON L.inci_id = I.inci_id
        WHERE 
          transtype='A'          
          AND LEN(comments) > 0
          AND PATINDEX('%STAT/BEAT%', UPPER(comments)) = 0

        UNION ALL

        SELECT
          0 note_id
          ,L.logid log_id
          ,L.timestamp
          ,LTRIM(RTRIM(L.inci_id)) inci_id
          ,LTRIM(RTRIM(L.unitcode)) + ' > ' + L.comments raw_note
          ,L.unitcode raw_unitcode
          ,LTRIM(RTRIM(L.userid)) userid
        FROM cad.dbo.log L
        INNER JOIN OpenIncidents I ON L.inci_id = I.inci_id
        WHERE 
          transtype='M'  
          OR (transtype='... ' AND LEFT(descript, 1) = 'M')

        UNION ALL

        SELECT
          0 note_id
          ,L.incilogid log_id
          ,L.timestamp
          ,LTRIM(RTRIM(L.inci_id)) inci_id
          ,LTRIM(RTRIM(L.unitcode)) + ' > ' + L.comments raw_note
          ,L.unitcode raw_unitcode
          ,LTRIM(RTRIM(L.userid)) userid
        FROM cad.dbo.incilog L
        INNER JOIN ClosedIncidents I ON L.inci_id = I.inci_id
        WHERE 
          transtype='M'
          OR (transtype='... ' AND LEFT(descript, 1) = 'M')

        UNION ALL

        SELECT
          0 note_id
          ,L.logid log_id
          ,L.timestamp
          ,LTRIM(RTRIM(L.inci_id)) inci_id
          ,LTRIM(RTRIM(REPLACE(REPLACE(descript, '{', ''), '}', '>'))) raw_note
          ,L.unitcode raw_unitcode
          ,LTRIM(RTRIM(L.userid)) userid
        FROM cad.dbo.log L
        INNER JOIN OpenIncidents I ON L.inci_id = I.inci_id
        WHERE           
          LEFT(descript, 1) = '{'

        UNION ALL

        SELECT
          0 note_id
          ,L.incilogid log_id
          ,L.timestamp
          ,LTRIM(RTRIM(L.inci_id)) inci_id
          ,LTRIM(RTRIM(REPLACE(REPLACE(descript, '{', ''), '}', '>'))) raw_note
          ,L.unitcode raw_unitcode
          ,LTRIM(RTRIM(L.userid)) userid
        FROM cad.dbo.incilog L
        INNER JOIN ClosedIncidents I ON L.inci_id = I.inci_id
        WHERE           
          LEFT(descript, 1) = '{'
        ORDER BY timestamp DESC, log_id ASC
"
      Dim C As New CADData()
      Return C.Get_Data(Of Note)(query, C.CAD)
    End Function

    Public Shared Function GetCachedNotes() As List(Of Note)
      Dim CIP As New CacheItemPolicy
      CIP.AbsoluteExpiration = Now.AddSeconds(30)
      Return myCache.GetItem("AllNotes", CIP)
    End Function

    Public Function ToCADCallDetail() As CallDetail
      Dim ccd As New CallDetail With {
        .Comments = Me.note.Trim,
        .UserTyped = Me.note.Trim,
        .Timestamp = Me.timestamp,
        .IncidentID = Me.inci_id.Trim,
        .LogID = 0,
        .NoteID = Me.note_id,
        .UserID = Me.userid.Trim,
        .Description = "NOTE"
      }
      Return ccd
    End Function

    Public Shared Function GetAllNotesToCallDetail() As List(Of CallDetail)
      Dim notes = GetCachedNotes()
      Dim details = (From n In notes
                     Where n.note_id > 0
                     Select n.ToCADCallDetail()).ToList
      Return details
    End Function

    Public Shared Function GetCachedNotesToCallDetail() As List(Of CallDetail)
      Dim CIP As New CacheItemPolicy
      CIP.AbsoluteExpiration = Now.AddSeconds(30)
      Return myCache.GetItem("AllNotesCADCallDetail", CIP)
    End Function

    Public Shared Function GetNewNotes() As List(Of Note)
      Dim dp As New DynamicParameters
      ' Get Last timestamp from cached data
      Dim timestamp As DateTime = GetCachedNotes().First().timestamp
      dp.Add("@timestamp", timestamp)
      Dim query As String = "
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

        WITH OpenIncidents AS (

          SELECT
            inci_id
          FROM incident
          WHERE
            inci_id != ''
            AND cancelled = 0

        ), ClosedIncidents AS (

          SELECT
            inci_id
          FROM inmain
          WHERE
            cancelled = 0
            AND CAST(calltime AS DATE) > @StartDate

        ), AllIncidents AS (

          SELECT
            inci_id
          FROM OpenIncidents

          UNION

          SELECT
            inci_id
          FROM ClosedIncidents

        )

        SELECT
          N.id note_id  
          ,0 log_id
          ,N.datetime timestamp
          ,N.eventid inci_id
          ,N.notes raw_note  
          ,'' raw_unitcode
          ,userid          
        FROM cad.dbo.incinotes N
        INNER JOIN AllIncidents I ON N.eventid = I.inci_id
        WHERE
          datetime > @timestamp

        UNION ALL

        SELECT
          0 note_id
          ,L.logid log_id
          ,L.timestamp
          ,L.inci_id
          ,LTRIM(RTRIM(L.unitcode)) + ' > ' + L.comments raw_note
          ,L.unitcode raw_unitcode
          ,L.userid
        FROM cad.dbo.log L
        INNER JOIN OpenIncidents I ON L.inci_id = I.inci_id
        WHERE 
          transtype='A'          
          AND LEN(comments) > 0
          AND PATINDEX(';', comments) = 0
          AND timestamp > @timestamp

        UNION ALL

        SELECT
          0 note_id
          ,L.incilogid log_id
          ,L.timestamp
          ,L.inci_id
          ,LTRIM(RTRIM(L.unitcode)) + ' > ' + L.comments raw_note
          ,L.unitcode raw_unitcode
          ,L.userid
        FROM cad.dbo.incilog L
        INNER JOIN ClosedIncidents I ON L.inci_id = I.inci_id
        WHERE 
          transtype='A'          
          AND LEN(comments) > 0
          AND PATINDEX('%STAT/BEAT%', UPPER(comments)) = 0
          AND timestamp > @timestamp

        UNION ALL

        SELECT
          0 note_id
          ,L.logid log_id
          ,L.timestamp
          ,L.inci_id
          ,LTRIM(RTRIM(L.unitcode)) + ' > ' + L.comments raw_note
          ,L.unitcode raw_unitcode
          ,L.userid
        FROM cad.dbo.log L
        INNER JOIN OpenIncidents I ON L.inci_id = I.inci_id
        WHERE 
          transtype='M'  
          AND timestamp > @timestamp

        UNION ALL

        SELECT
          0 note_id
          ,L.incilogid log_id
          ,L.timestamp
          ,L.inci_id
          ,LTRIM(RTRIM(L.unitcode)) + ' > ' + L.comments raw_note
          ,L.unitcode raw_unitcode
          ,L.userid
        FROM cad.dbo.incilog L
        INNER JOIN ClosedIncidents I ON L.inci_id = I.inci_id
        WHERE 
          transtype='M'
          AND timestamp > @timestamp
        ORDER BY timestamp DESC
"
      Dim C As New CADData()
      Return C.Get_Data(Of Note)(query, dp, C.CAD)
    End Function

    ' GetHistoricalCallNotes by InciId and the calls that match that Incid's street

    ' GetClosedCallNotes optional CallDate arg

    Public Shared Function GetHistoricalCallNotes(IncidentID As String) As List(Of Note)
      Dim dp As New DynamicParameters
      ' Get Last timestamp from cached data
      dp.Add("@IncidentID", IncidentID)
      Dim query As String = "

WITH Streets
     AS (SELECT
           street
         FROM
           inmain
         WHERE
          inci_id = @IncidentID
         UNION
         SELECT
           street
         FROM
           incident
         WHERE
          inci_id = @IncidentID
)
    ,Incidents
     AS (SELECT TOP 30
           inci_id
         FROM
           inmain I
           INNER JOIN Streets S ON I.street = S.street
         WHERE
          inci_id != ''
          AND cancelled = 0
          AND inci_id != @IncidentID
         ORDER  BY
          calltime DESC) 
SELECT
  N.id note_id
  ,0 log_id
  ,N.datetime timestamp
  ,N.eventid inci_id
  ,N.notes raw_note
  ,'' raw_unitcode
  ,ISNULL(userid, '') userid
FROM
  cad.dbo.incinotes N
  INNER JOIN Incidents I ON N.eventid = I.inci_id
UNION ALL
SELECT
  0 note_id
  ,L.incilogid log_id
  ,L.timestamp
  ,L.inci_id
  ,LTRIM(RTRIM(L.unitcode)) + ' > ' + L.comments raw_note
  ,L.unitcode raw_unitcode
  ,L.userid
FROM
  cad.dbo.incilog L
  INNER JOIN Incidents I ON L.inci_id = I.inci_id
WHERE
  transtype = 'A'
  AND LEN(comments) > 0
  AND PATINDEX('%STAT/BEAT%'
               ,UPPER(comments)) = 0
UNION ALL
SELECT
  0 note_id
  ,L.incilogid log_id
  ,L.timestamp
  ,L.inci_id
  ,LTRIM(RTRIM(L.unitcode)) + ' > ' + L.comments raw_note
  ,L.unitcode raw_unitcode
  ,L.userid
FROM
  cad.dbo.incilog L
  INNER JOIN Incidents I ON L.inci_id = I.inci_id
WHERE
  transtype = 'M'
  OR (transtype='... ' AND LEFT(descript, 1) = 'M')
ORDER  BY
  timestamp DESC, log_id ASC "
      Dim C As New CADData()
      Return C.Get_Data(Of Note)(query, dp, C.CAD)
    End Function


  End Class
End Namespace
