Imports Dapper
Imports System.Data.SqlClient
Imports System.Data
Imports System.Runtime.Caching
Imports System.Environment

Namespace Models


  Public Class Replay
    Public Property StartDate As Date
    Public Property EndDate As Date
    Public Property IsError As Boolean = False
    Public Property ErrorMessage As String = ""
    Public Property CadCallerLocations As New List(Of CadCallerLocation)
    ' Get Units Last Move from incilog/log
    ' FIgure out how to process the Last Move into Available Out of District or not.
    Public Property LastUnitMoves As List(Of UnitMove) = New List(Of UnitMove)
    Public Property UnitLocations As List(Of ActiveUnit) = New List(Of ActiveUnit) ' Need to pull in AVL and CAD locations
    Public Property Staffing As New List(Of Telestaff_Staff)
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
    Public Property CallDetail As List(Of CallDetail) = New List(Of CallDetail)
    ' CallDetail should be for this call AND for any logs about this call's units.

    'Public Property TelestaffData As ManpowerData ' Pull this based on the time of the call.
    ' Not sure how this will work for Chiefs, may need to pull in who is assigned to that unit in cad.

    ' Need to allow for choosing between showing all units or showing only those units
    ' that were on the call.

    Public Shared Function ReplayByCaseID(CaseID As String) As Replay
      Dim cc As CADCall = CADCall.GetCallByCaseID(CaseID)
      If cc Is Nothing Then
        ' If the call wasn't found, return that the call was not found in the closed calls log.  
        ' Mention that Active Calls are not able to be replayed until they are closed.
        Dim r As New Replay With {
          .IsError = True,
          .ErrorMessage = "There was an error finding this call.  If this is an active call, be aware that this process only works for Closed calls."
        }
        Return r
      Else
        Return New Replay(cc.CallTime, cc.CloseTime)
      End If
    End Function

    Public Shared Function GetCachedReplayByCaseID(CaseID As String) As Replay
      Dim CIP As New CacheItemPolicy
      CIP.AbsoluteExpiration = Now.AddHours(1)
      Return myCache.GetItem("ReplayByCaseID-" & CaseID, CIP)
    End Function

    Public Sub New()

    End Sub

    Public Sub New(StartDate As Date, EndDate As Date)
      Me.StartDate = StartDate
      Me.EndDate = EndDate
      ' If the call was older than 180 days we should stop
      If Today.Subtract(StartDate).TotalDays > 179 Then
        Me.IsError = True
        Me.ErrorMessage = "Only calls from the last 180 days can be replayed."
        Return
      End If
      ' Check how long the call was open for.  If it was more than 12 hours return an error.
      If EndDate.Subtract(StartDate).TotalHours > 12 Then
        Me.IsError = True
        Me.ErrorMessage = "This call's duration is too long to be replayed."
        Return
      End If

      ' Get a list of the different Caller Locations for this period 
      Me.CadCallerLocations = CadCallerLocation.GetCadCallerLocationsByPeriod(Me.StartDate, Me.EndDate)

      ' determine if any of the units were AvailableOutOfDistrict at the time
      ' of the call before they were on the call and then update those rows accordingly.

      Me.LastUnitMoves = UnitMove.GetUnitMovesByStartDate(Me.StartDate)

      ' Get a list of all of the Telestaff Data for this call's period, Load this data into the units.
      Me.Staffing = Telestaff_Staff.GetStaffingBasedOnTime(Me.StartDate, Me.EndDate)

      ' Get the Call Detail for this period
      ' Figure out how to apply the Offline attribute to this period.
      ' they can be found in the calldetail data. transtype='OS' descript='AVL' comments='OFFLINE'




      ' Get the Unit Locations for this incident's time range based on the start and end time
      ' In order to fill this data out correctly, we will need to apply
      ' the Staffing data and the call detail data, and perhaps the unitMove data.


    End Sub





  End Class



End Namespace