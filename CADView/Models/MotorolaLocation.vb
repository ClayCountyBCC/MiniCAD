Imports System.Data
Imports System.Data.SqlClient
Imports Dapper
Imports System.Runtime.Caching

Namespace Models

  Public Class MotorolaLocation

    Public Property device_id As Integer
    Public Property device_alias As String
    Public Property timestamp As Date
    Public ReadOnly Property timestamp_formatted As String
      Get
        Return timestamp.ToString()
      End Get
    End Property

    Public Property latitude As Decimal
    Public Property longitude As Decimal

    Sub New()
    End Sub

    Public Shared Function GetLocations() As List(Of MotorolaLocation)
      Dim query As String = $"
      USE Tracking;

      SELECT
        D.device_id
        ,D.alias device_alias
        ,L.timestamp
        ,L.latitude
        ,L.longitude
      FROM motorola_locations L
      INNER JOIN motorola_devices D ON L.device_id = D.device_id
      WHERE 
        1=1
        AND security_group = 'CCFR'
      ORDER BY alias"
      Dim C As New CADData()

      Return C.Get_Data(Of MotorolaLocation)(query, C.CAD)
    End Function

    Public Shared Function Get_All_Locations() As List(Of MotorolaLocation)
      Dim query As String = $"
      USE Tracking;

      SELECT
        D.device_id
        ,D.alias device_alias
        ,L.timestamp
        ,L.latitude
        ,L.longitude
      FROM motorola_locations L
      INNER JOIN motorola_devices D ON L.device_id = D.device_id
      ORDER BY alias"
      Dim C As New CADData()

      Return C.Get_Data(Of MotorolaLocation)(query, C.CAD)
    End Function

    Public Shared Function CheckAccess(name As String) As Boolean
      Dim AccessCIP As New CacheItemPolicy With {
        .AbsoluteExpiration = Now.AddHours(8)
      }
      Dim accesslist As List(Of String) = myCache.GetItem("RadioAccess", AccessCIP)
      Return accesslist.Contains(name.ToLower().Replace("claybcc\", ""))
    End Function

    Public Shared Function CheckAccess_All(name As String) As Boolean
      Dim AccessCIP As New CacheItemPolicy With {
        .AbsoluteExpiration = Now.AddHours(8)
      }
      Dim accesslist As List(Of String) = myCache.GetItem("RadioAccess_All", AccessCIP)
      Return accesslist.Contains(name.ToLower().Replace("claybcc\", ""))
    End Function

    Public Shared Function GetRadioAccessUsers() As List(Of String)
            '
            Return New List(Of String) From
        {
        "mccartneyd",
        "naglet",
        "devink",
        "mockl",
        "motesd",
        "boreej",
        "sasska",
        "haned",
        "robinsonf",
        "cashm",
        "fortunej"
      }
        End Function

    Public Shared Function Get_All_RadioAccessUsers() As List(Of String)
      '
      Return New List(Of String) From
        {
        "robinsonf"
      }
    End Function



  End Class
End Namespace