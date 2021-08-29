Imports Dapper
Imports System.Collections.Generic
Imports System.Runtime.Caching

Namespace Models


  Public Class HistoricalCall
    Public Property IncidentID As String ' This is the inci_id from CAD
    Public Property Nature As String ' The reason for the call
    Public Property CallTime As DateTime ' The calltime field in CAD
    Public Property CCFR As String = ""
    Public Property Notes As List(Of Note)

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

    Public Shared Function GetCachedHistoricalCallsByIncidentID(IncidentID As String) As List(Of HistoricalCall)
      Dim CIP As New CacheItemPolicy
      CIP.AbsoluteExpiration = Now.AddSeconds(60)
      Return myCache.GetItem("CallAddressHistory-" & IncidentID, CIP)
    End Function


    Public Shared Function GetHistoricalCallsByIncidentID(IncidentID As String) As List(Of HistoricalCall)
      Dim dp As New DynamicParameters
      dp.Add("@IncidentID", IncidentID)
      Dim query As String = "
WITH Streets AS (

  SELECT
    street
  FROM inmain
  WHERE
    inci_id = @IncidentID

  UNION

  SELECT
    street
  FROM incident
  WHERE
    inci_id = @IncidentID

)

SELECT TOP 20
  LTRIM(RTRIM(inci_id)) IncidentID
  ,nature Nature
  ,calltime CallTime  
  ,case_id CCFR
FROM
  inmain I
  INNER JOIN Streets S ON I.street = S.street
WHERE
  cancelled = 0
  AND inci_id <> ''
  AND inci_id <> @IncidentID
ORDER  BY
  calltime DESC"


      Dim c As New CADData()
      Dim calls = c.Get_Data(Of HistoricalCall)(query, dp, c.CAD)
      If calls.Count() > 0 Then
        Dim notes = Note.GetHistoricalCallNotes(IncidentID)
        For Each hc In calls
          hc.Notes = (From n In notes Where n.inci_id = hc.IncidentID Select n Order By n.timestamp Descending).ToList
        Next
      End If
      Return calls
    End Function
  End Class
End Namespace