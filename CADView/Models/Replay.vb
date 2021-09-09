Imports Dapper
Imports System.Data.SqlClient
Imports System.Data
Imports System.Runtime.Caching

Namespace Models


  Public Class Replay
    Public Property CaseID As String = ""
    Public Property UnitCode As String = ""
    Public Property IncludeAllUnits As Boolean = False
    Public Property StartDate As Date
    Public Property EndDate As Date
    Public Property IsError As Boolean = False
    Public Property ErrorMessage As String = ""
    ' Get Units Last Move from incilog/log
    ' FIgure out how to process the Last Move into Available Out of District or not.
    Public Property UnitLocations As List(Of CADData.ActiveUnit) ' Need to pull in AVL and CAD locations
    ' Convert UnitLocation Timestamp into Seconds since call start.
    ' We need to do what we can to figure out where a unit was when the call started
    ' This may require looking at data well before our call.
    ' might try selecting data
    ' This sql query works:
    ' Select Case TOP 1
    ' *
    ' FROM unit_tracking_data_history
    ' WHERE
    '   unitcode='E24'
    '   And inserted_on < '9/4/2021 10:54 PM'
    'ORDER BY inserted_on DESC
    ' If a unit is available out of district before a call starts, they should remain that way
    ' until they are dispatched.
    Public Property CallDetail As List(Of CADData.CADCallDetail) ' Need to process this for Moves
    ' CallDetail should be for this call AND for any logs about this call's units.

    Public Property CallInfo As CADData.CaDCall
    'Public Property TelestaffData As ManpowerData ' Pull this based on the time of the call.
    ' Not sure how this will work for Chiefs, may need to pull in who is assigned to that unit in cad.

    ' Need to allow for choosing between showing all units or showing only those units
    ' that were on the call.

  End Class



End Namespace