Imports Dapper
Imports System.Data.SqlClient
Imports System.Data
Imports System.Runtime.Caching

Namespace Models


  Public Class Replay
    Public Property UnitLocations As List(Of CADData.ActiveUnit) ' Need to pull in AVL and CAD locations
    Public Property CallDetail As List(Of CADData.CADCallDetail) ' Need to process this for Moves
    Public Property CallInfo As CADData.CaDCall
    'Public Property TelestaffData As ManpowerData
    ' Get Units Last Move from incilog/log

  End Class

End Namespace