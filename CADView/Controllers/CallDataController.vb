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
  Private updateCounter As Integer = 0
  'Private cache As ObjectCache = MemoryCache.Default

  Public Function GetShortUnitStatus() As JsonResult
    Try
      Return Json(New With {.Result = "success", .Records = GetUpdatedUnitStatus()}, JsonRequestBehavior.AllowGet)
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  Private Function GetUpdatedUnitStatus() As List(Of CADData.ActiveUnit)
    Dim CIP As New CacheItemPolicy
    CIP.AbsoluteExpiration = Now.AddSeconds(6)
    Dim au As List(Of CADData.ActiveUnit) = myCache.GetItem(unitStatusKey, CIP)
    'Dim myCache As Cache = HttpContext.Cache
    'Dim c As New CADData

    'Dim au As List(Of CADData.ActiveUnit) = myCache(unitStatusKey)
    'Dim sf As List(Of CADData.Telestaff_Staff) = myCache(staffKey)

    'If sf Is Nothing Then ' Cache not found, let's query the DB
    '  sf = c.GetStaffingFromTelestaff
    '  myCache.Insert(staffKey, sf, Nothing, Now.AddMinutes(10), TimeSpan.Zero)
    'End If
    'If au Is Nothing Then ' Cache not found, let's query the DB
    '  au = c.GetShortActiveUnitStat(sf)
    '  ' Now that we've updated the data, let's cache it.
    '  myCache.Insert(unitStatusKey, au, Nothing, Now.AddSeconds(6), TimeSpan.Zero)
    '  Debug.WriteLine("updated " & Now.ToLongTimeString)
    'End If
    Return au
  End Function

  <HttpGet()>
  Public Function GetRadioLocations() As JsonResult
    Try
      If MotorolaLocation.CheckAccess(Request.LogonUserIdentity.Name) Then
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
  Public Function GetCallerLocations() As JsonResult
    Try
      Dim Locations As List(Of CallerLocation) = CallerLocation.GetCachedLatest()
      Return Json(New With {.Result = "OK", .Records = Locations}, JsonRequestBehavior.AllowGet)
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  <HttpGet()>
  Public Function GetExtraMapPoints() As JsonResult
    Try
      Dim CIP As New CacheItemPolicy
      CIP.AbsoluteExpiration = Now.AddMinutes(30)
      Dim Locations As List(Of Extra_Map_Points) = myCache.GetItem("ExtraMapPoints", CIP)
      Return Json(New With {.Result = "OK", .Records = Locations}, JsonRequestBehavior.AllowGet)
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  Public Function GetActiveCalls() As JsonResult
    Try
      Dim MyCache As Cache = HttpContext.Cache
      Dim C As New CADData, AC As List(Of CADData.CaDCall) = MyCache(activeKey)
      Dim AU As List(Of CADData.ActiveUnit) = GetUpdatedUnitStatus()
      If AC Is Nothing Then ' Not found, let's query for it
        AC = C.GetActiveCalls(AU)
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
      Dim ac As List(Of CADData.Advisory) = MyCache(advisoriesKey)
      If ac Is Nothing Then ' Not found, let's query for it
        Dim c As New CADData
        ac = c.GetActiveAdvisories()
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
      Dim ac As List(Of CADData.CaDCall) = myCache(historyKey)
      If ac Is Nothing Then ' Not found, let's query for it
        Dim c As New CADData
        ac = c.GetHistoricalCalls
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
      Dim C As New CADData
      Dim CD As List(Of CADData.CADCallDetail) = C.GetCallDetail(IncidentID, Timestamp)
      Return Json(New With {.Result = "OK", .Records = CD}, JsonRequestBehavior.AllowGet)
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  Public Function GetHistoricalCallHistory(IncidentID As String) As JsonResult
    Try
      Dim C As New CADData
      'Dim CD As List(Of CADData.CaDCall) = C.GetHistoricalCallsByAddressForHistoricalCall(IncidentID)
      'Dim HistoricalCalls = HistoricalCall.GetHistoricalCallsByIncidentID(IncidentID)
      Dim HistoricalCalls = HistoricalCall.GetCachedHistoricalCallsByIncidentID(IncidentID)
      Return Json(New With {.Result = "OK", .Records = HistoricalCalls}, JsonRequestBehavior.AllowGet)
    Catch ex As Exception
      Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
      Return Json(New With {.Result = "Error", .Records = Nothing})
    End Try
  End Function

  'Public Function GetCallHistory(IncidentID As String) As JsonResult
  '  Try
  '    Dim C As New CADData
  '    Dim CD As List(Of CADData.CADCallDetail) = C.GetCallDetail(IncidentID)
  '    Return Json(New With {.Result = "OK", .Records = CD}, JsonRequestBehavior.AllowGet)
  '  Catch ex As Exception
  '    Tools.Log(ex, AppID, MachineName, Tools.Logging.LogType.Database)
  '    Return Json(New With {.Result = "Error", .Records = Nothing})
  '  End Try
  'End Function

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

