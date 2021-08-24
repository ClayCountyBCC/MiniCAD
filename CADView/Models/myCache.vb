Imports System.Runtime.Caching

Namespace Models

  Public NotInheritable Class myCache
    Private Shared _cache As New MemoryCache("myCache")

    Public Shared Function GetItem(key As String, Optional CIP As CacheItemPolicy = Nothing) As Object
      Dim tmpCIP As New CacheItemPolicy
      If Not CIP Is Nothing Then
        tmpCIP = CIP
      Else
        tmpCIP.AbsoluteExpiration = Now.AddHours(1)

      End If
      Return GetOrAddExisting(key, tmpCIP, Function() InitItem(key))
    End Function

    Private Shared Function GetOrAddExisting(Of T)(key As String, CIP As CacheItemPolicy, valueFactory As Func(Of T)) As T
      Dim newValue = New Lazy(Of T)(valueFactory)
      Dim oldValue = TryCast(_cache.AddOrGetExisting(key, newValue, CIP), Lazy(Of T))
      Try
        Return (If(oldValue, newValue)).Value
      Catch
        ' Handle cached lazy exception by evicting from cache. Thanks to Denis Borovnev for pointing this out!
        _cache.Remove(key)
        Throw
      End Try
    End Function

    Public Shared Function Add(key As String, value As Object, CIP As CacheItemPolicy) As Boolean
      If _cache.Contains(key) Then _cache.Remove(key)
      Return _cache.Add(key, value, CIP)
    End Function

    Public Shared Function GetObject(key As String) As Object
      Return _cache.Get(key)
    End Function

    Private Shared Function InitItem(key As String) As Object
      ' Do something expensive to initialize item
      Dim c As New CADData
      Select Case key
        Case "ExtraMapPoints"
          Return Extra_Map_Points.Get_Points()
        Case "TelestaffStaff"
          Return c.GetStaffingFromTelestaff
        Case "ShortUnitStatus"
          Dim staffingCIP = New CacheItemPolicy()
          staffingCIP.AbsoluteExpiration = Now.AddMinutes(10)
          Dim staffList = myCache.GetItem("TelestaffStaff", staffingCIP)
          'Debug.WriteLine("shortunitstatus queried " & Now.ToLongTimeString)
          Return c.GetShortActiveUnitStat(staffList)
        Case "caller_locations"
          Return CallerLocation.GetLatest()
        Case "ActiveCalls"

        Case "Advisories"
        Case "HistoricalCalls"
        Case "MotorolaLocations"
          Return MotorolaLocation.GetLocations()
        Case "RadioAccess"
          Return MotorolaLocation.GetRadioAccessUsers()
      End Select
      Return Nothing
    End Function
  End Class
End Namespace
