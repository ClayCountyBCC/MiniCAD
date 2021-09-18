Imports System.Web.Caching
Imports System.Runtime.Caching
Imports System.Web.Mvc
Imports CADView.Models
Imports System.Environment
'Imports System.Runtime.Caching


Public Class CallDataController
  Inherits Controller
  Private Const staffKey As String = "TelestaffStaff"
  Private Const unitStatusKey As String = "ShortUnitStatus"
  Private Const activeKey As String = "ActiveCalls"
  Private Const advisoriesKey As String = "Advisories"
  Private Const historyKey As String = "HistoricalCalls"
  Private Const AppID As Integer = 10002
  'Private cache As ObjectCache = MemoryCache.Default

  Public Function GetShortUnitStatus() As JsonResult
    Try
      Return Json(New With {.Result = "success", .Records = GetUpdatedUnitStatus()}, JsonRequestBehavior.AllowGet)
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  Private Function GetUpdatedUnitStatus() As List(Of ActiveUnit)
    Dim CIP As New CacheItemPolicy
    CIP.AbsoluteExpiration = Now.AddSeconds(6)
    Dim au As List(Of ActiveUnit) = myCache.GetItem(unitStatusKey, CIP)
    Return au
  End Function

  <HttpGet()>
  Public Function GetRadioLocations() As JsonResult
    Try
      If CADData.IsInternal() AndAlso MotorolaLocation.CheckAccess(Request.LogonUserIdentity.Name) Then
        Dim CIP As New CacheItemPolicy
        CIP.AbsoluteExpiration = Now.AddMinutes(1)
        Dim Locations As List(Of MotorolaLocation) = myCache.GetItem("MotorolaLocations", CIP)
        Return Json(New With {.Result = "OK", .Records = Locations}, JsonRequestBehavior.AllowGet)
      Else
        Return Json(New With {.Result = "OK", .Records = Nothing}, JsonRequestBehavior.AllowGet)
      End If
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  <HttpGet()>
  Public Function GetReplayDataByCaseID(CaseID As String) As Replay
    Try
      Return Replay.GetCachedReplayByCaseID(CaseID)
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Nothing
    End Try
  End Function

  <HttpGet()>
  Public Function GetReplayDataByPeriod(StartDate As Date, Duration As Integer) As Replay
    Try
      If Duration > 12 Then Duration = 12
      Return New Replay(StartDate, StartDate.AddHours(Duration))
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Nothing
    End Try
  End Function

  <HttpGet()>
  Public Function GetCallerLocations() As JsonResult
    Try
      If CADData.IsInternal() Then
        Dim Locations As List(Of CallerLocation) = CallerLocation.GetCachedLatest()
        Return Json(New With {.Result = "OK", .Records = Locations}, JsonRequestBehavior.AllowGet)
      Else
        Return Json(New With {.Result = "OK", .Records = Nothing}, JsonRequestBehavior.AllowGet)
      End If

    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  Public Function GetActiveCalls() As JsonResult
    Try
      Dim MyCache As Cache = HttpContext.Cache
      Dim AC As List(Of CADCall) = MyCache(activeKey)
      Dim AU As List(Of ActiveUnit) = GetUpdatedUnitStatus()
      If AC Is Nothing Then ' Not found, let's query for it
        AC = CADCall.GetActiveCalls(AU)
        MyCache.Insert(activeKey, AC, Nothing, Now.AddSeconds(30), TimeSpan.Zero)
      End If
      Return Json(New With {.Result = "OK", .Records = AC, .TotalRecordCount = AC.Count}, JsonRequestBehavior.AllowGet)
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  Public Function GetAdvisories() As JsonResult
    Try
      Dim MyCache As Cache = HttpContext.Cache
      Dim ac As List(Of Advisory) = MyCache(advisoriesKey)
      If ac Is Nothing Then ' Not found, let's query for it
        ac = Advisory.GetActiveAdvisories()
        MyCache.Insert(advisoriesKey, ac, Nothing, Now.AddMinutes(5), TimeSpan.Zero)
      End If
      Return Json(New With {.Result = "OK", .Records = ac, .TotalRecordCount = ac.Count}, JsonRequestBehavior.AllowGet)
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  Public Function GetHistoricalCalls() As JsonResult
    Try
      Dim myCache As Cache = HttpContext.Cache
      Dim ac As List(Of CADCall) = myCache(historyKey)
      If ac Is Nothing Then ' Not found, let's query for it
        ac = CADCall.GetHistoricalCalls
        myCache.Insert(historyKey, ac, Nothing, Now.AddMinutes(5), TimeSpan.Zero)
      End If
      Return Json(New With {.Result = "OK", .Records = ac}, JsonRequestBehavior.AllowGet)
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  Public Function GetCallDetail(IncidentID As String, Optional Timestamp As Date = Nothing) As JsonResult
    Try
      Dim CD As List(Of CallDetail) = CallDetail.GetCallDetail(IncidentID, Timestamp)
      Return Json(New With {.Result = "OK", .Records = CD}, JsonRequestBehavior.AllowGet)
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  Public Function GetHistoricalCallHistory(IncidentID As String) As JsonResult
    Try
      Dim C As New CADData
      'Dim CD As List(Of CADCall) = C.GetHistoricalCallsByAddressForHistoricalCall(IncidentID)
      'Dim HistoricalCalls = HistoricalCall.GetHistoricalCallsByIncidentID(IncidentID)
      Dim HistoricalCalls = HistoricalCall.GetCachedHistoricalCallsByIncidentID(IncidentID)
      Return Json(New With {.Result = "OK", .Records = HistoricalCalls}, JsonRequestBehavior.AllowGet)
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  <HttpPost()>
  Public Function SavePosition(td As CADData.Tracking_Data) As JsonResult
    Dim C As New CADData
    If C.Save_Tracking(C.Tracking_Data_To_Full_Tracking_Data(td, Request.UserHostAddress, Request.UserAgent)) Then
      Return Json(New With {.Result = "OK", .Records = "True"}, JsonRequestBehavior.AllowGet)
    Else
      Return Json(New With {.Result = "Error", .Records = "False"})
    End If
  End Function

  <HttpPost()>
  Public Function SavePositionList(tdl As List(Of CADData.Tracking_Data)) As JsonResult
    Dim C As New CADData
    For Each td In tdl
      C.Save_Tracking(C.Tracking_Data_To_Full_Tracking_Data(td, Request.UserHostAddress, Request.UserAgent))
    Next
    Return Json(New With {.Result = "OK", .Records = "True"}, JsonRequestBehavior.AllowGet)
  End Function



End Class

