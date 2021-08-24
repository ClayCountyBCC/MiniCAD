Imports System.Data
Imports System.Data.SqlClient
Imports Dapper
Imports System.Runtime.Caching

Namespace Models

  Public Class CallerLocation

    Public Property call_origin_time As Date = Date.MinValue
    Public Property location_id As Long = -1
    Public Property phone_number As String = ""
    Public Property agency As String = ""
    Public Property call_type As String = ""
    Public Property latitude As Decimal = 0
    Public Property longitude As Decimal = 0
    Public Property confidence As String = ""
    Public Property unique_id As Integer = -1
    Public ReadOnly Property formatted_call_origin_time As String
      Get
        Return call_origin_time.ToString()
      End Get
    End Property
    Public ReadOnly Property caller_age_indicator As String
      Get
        Dim t = Date.Now.Subtract(call_origin_time).TotalSeconds
        'If t < 900 Then Return ".9"
        'If t < 1800 Then Return ".675"
        'If t < 2700 Then Return ".45"
        'Return ".225"
        If t < 900 Then Return "255"
        If t < 1800 Then Return "191"
        If t < 2700 Then Return "127"
        Return "63"
      End Get
    End Property


    Public Sub New()

    End Sub

    Public Shared Function GetLatest() As List(Of CallerLocation)
      Dim query As String = "
      EXEC Tracking.dbo.UpdateUniqueCallers;
      SELECT
        C.call_origin_time
        ,CL.location_id
        ,C.phone_number
        ,CL.agency
        ,CL.call_type
        ,CL.latitude
        ,CL.longitude
        ,CL.confidence
        ,U.unique_id
      FROM Tracking.dbo.[911_caller_locations] CL
      INNER JOIN Tracking.dbo.[911_callers] C ON CL.session_id = C.session_id
      LEFT OUTER JOIN Tracking.dbo.[911_caller_unique] U ON C.phone_number = U.phone_number
      WHERE
        C.call_origin_time > DATEADD(HOUR, -1, GETDATE())  
      ORDER BY C.call_origin_time DESC"
      Dim C As New CADData()

      Return C.Get_Data(Of CallerLocation)(query, C.CAD)
    End Function

    Public Shared Function GetCachedLatest() As List(Of CallerLocation)
      Dim CIP As New CacheItemPolicy
      CIP.AbsoluteExpiration = Now.AddSeconds(30)
      Return myCache.GetItem("caller_locations", CIP)
    End Function

  End Class
End Namespace
