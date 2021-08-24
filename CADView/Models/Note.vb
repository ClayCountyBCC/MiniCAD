Imports Dapper
Imports System.Text.RegularExpressions
Imports System.Data
Imports System.Data.SqlClient
Imports System
Imports System.Linq
Imports System.Collections.Generic

Namespace Models


  Public Class Note
    Private Const regex_match As String = "\s+\[\d\d/\d\d/\d\d\s\d\d:\d\d:\d\d\s\w+]|\[\w+\-\w+\] {(?<unit>\w+)}\s+"
    Public Property note_id As Integer = 0
    Public Property log_id As Integer = 0
    Public Property timestamp As Date
    Public Property inci_id As String
    Public Property userid As String
    Public Property raw_note As String = ""
    Public ReadOnly Property note
      Get
        Return Regex.Replace(raw_note, regex_match, "")
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
          ,N.notes note  
          ,'' raw_unitcode
          ,userid          
        FROM cad.dbo.incinotes N
        INNER JOIN AllIncidents I ON N.eventid = I.inci_id

        UNION ALL

        SELECT
          0 note_id
          ,L.logid log_id
          ,L.timestamp
          ,L.inci_id
          ,L.comments note
          ,L.unitcode raw_unitcode
          ,L.userid
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
          ,L.inci_id
          ,L.comments note
          ,L.unitcode raw_unitcode
          ,L.userid
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
          ,L.inci_id
          ,L.comments note
          ,L.unitcode raw_unitcode
          ,L.userid
        FROM cad.dbo.log L
        INNER JOIN OpenIncidents I ON L.inci_id = I.inci_id
        WHERE 
          transtype='M'  

        UNION ALL

        SELECT
          0 note_id
          ,L.incilogid log_id
          ,L.timestamp
          ,L.inci_id
          ,L.comments note
          ,L.unitcode raw_unitcode
          ,L.userid
        FROM cad.dbo.incilog L
        INNER JOIN ClosedIncidents I ON L.inci_id = I.inci_id
        WHERE 
          transtype='M'
        ORDER BY timestamp DESC
"
      Dim C As New CADData()
      Return C.Get_Data(Of Note)(query, C.CAD)
    End Function

    Public Shared Function GetNewNotes() As List(Of Note)
      Dim dp As New DynamicParameters
      ' Get max note_id
      ' Get max log_id
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
          ,N.notes note  
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
          ,L.comments note
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
          ,L.comments note
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
          ,L.comments note
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
          ,L.comments note
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
      Return C.Get_Data(Of Note)(query, C.CAD)
    End Function

    ' GetHistoricalCallNotes by InciId and the calls that match that Incid's street

    ' GetClosedCallNotes optional CallDate arg



  End Class
End Namespace
