Imports Dapper
Imports System.Data.SqlClient
Imports System.Data
Imports System.Runtime.Caching
Imports System.Environment

Namespace Models


  Public Class Replay
    Public Property CaseID As String = ""
    Public Property UnitCode As String = ""
    Public Property IncludeAllUnits As Boolean = False
    Public Property StartDate As Date
    Public Property EndDate As Date
    Public Property IsError As Boolean = False
    Public Property ErrorMessage As String = ""
    Public Property CadCallerLocations As New List(Of CadCallerLocation)
    ' Get Units Last Move from incilog/log
    ' FIgure out how to process the Last Move into Available Out of District or not.
    Public Property LastUnitMoves As List(Of UnitMove) = New List(Of UnitMove)
    Public Property UnitLocations As List(Of CADData.ActiveUnit) = New List(Of CADData.ActiveUnit) ' Need to pull in AVL and CAD locations
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
    Public Property CallDetail As List(Of CADData.CADCallDetail) = New List(Of CADData.CADCallDetail)
    ' CallDetail should be for this call AND for any logs about this call's units.

    Public Property CallInfo As CADData.CaDCall
    'Public Property TelestaffData As ManpowerData ' Pull this based on the time of the call.
    ' Not sure how this will work for Chiefs, may need to pull in who is assigned to that unit in cad.

    ' Need to allow for choosing between showing all units or showing only those units
    ' that were on the call.

    Public Shared Function ReplayAllUnits(CaseID As String) As Replay
      Return New Replay(CaseID, True)
    End Function

    Public Shared Function ReplayCallUnitsOnly(CaseID As String) As Replay
      Return New Replay(CaseID, False)
    End Function

    Public Shared Function GetCachedReplayAllUnits(CaseID As String) As Replay
      Dim CIP As New CacheItemPolicy
      CIP.AbsoluteExpiration = Now.AddHours(1)
      Return myCache.GetItem("ReplayAllUnits-" & CaseID, CIP)
    End Function

    Public Shared Function GetCachedReplayCallUnitsOnly(CaseID As String) As Replay
      Dim CIP As New CacheItemPolicy
      CIP.AbsoluteExpiration = Now.AddHours(1)
      Return myCache.GetItem("ReplayCallUnitsOnly-" & CaseID, CIP)
    End Function

    Public Sub New(CaseID As String, IncludeAllUnits As Boolean)
      Me.IncludeAllUnits = IncludeAllUnits
      Me.CaseID = CaseID
      ' Get the call data which will also give us the start/end date
      Me.CallInfo = GetCallByCaseID(CaseID)
      If Not Me.CallInfo Is Nothing Then
        Me.StartDate = Me.CallInfo.CallTime
        Me.EndDate = Me.CallInfo.CloseTime
      Else
        ' If the call wasn't found, return that the call was not found in the closed calls log.  
        ' Mention that Active Calls are not able to be replayed until they are closed.
        Me.IsError = True
        Me.ErrorMessage = "There was an error finding this call.  If this is an active call, be aware that this process only works for Closed calls."
        Return
      End If
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

      ' Get a list of the different Caller Locations for this period / call
      Me.CadCallerLocations = CadCallerLocation.GetCadCallerLocationByCaseID(Me.CaseID, Me.StartDate, Me.EndDate)


      ' Get the Call Detail for this incident



      ' Use IncludeAllUnits to determine if any of the units were AvailableOutOfDistrict at the time
      ' of the call before they were on the call and then update those rows accordingly.
      If IncludeAllUnits Then
        Me.LastUnitMoves = UnitMove.GetAllUnitsByCaseID(Me.CaseID)
      Else
        Me.LastUnitMoves = UnitMove.GetCallUnitsOnlyByCaseID(Me.CaseID)
      End If

      ' Get the Unit Locations for this incident's time range based on the start and end time
      ' use the IncludeAllUnits to determine if we're getting every unit or just the units on this call.

      ' Get a list of all of the Telestaff Data for this call's period, Load this data into the units.
    End Sub

    Public Shared Function GetCallByCaseID(CaseID As String) As CADData.CaDCall
      ' This function will pull a list of the active calls, and pull a list of 
      ' units assigned to those calls
      ' Basically, anything in the incident table where inci_id <> ''
      ' and any units from the undisp table where inci_id <> ''
      ' Here we get the data from the database.
      Dim c As New CADData
      Dim D As New Tools.DB(c.CAD, CADData.AppID, CADData.ErrorHandling)
      'Dim au As List(Of ActiveUnit) = GetUnitStatus()
      'Dim Notes As List(Of Note) = Note.GetCachedNotes()
      'Dim test = (From n In Notes Where n.log_id > 0 Select n).ToList
      'Dim ad As List(Of CADCallDetail) = GetAllCallsDetail()
      Dim query As String = "
SELECT
  NULL AS latitude
  ,NULL AS longitude
  ,NULL AS confidence
  ,NULL AS proctime
  ,business
  ,crossroad1
  ,geox
  ,geoy
  ,inci_id
  ,nature
  ,calltime
  ,timeclose
  ,( CASE
       WHEN PATINDEX('%IST:%'
                     ,addtst) > 0
       THEN LTRIM(RTRIM(street))
       WHEN LEN(LTRIM(RTRIM(addtst))) = 0
       THEN LTRIM(RTRIM(street))
       ELSE LTRIM(RTRIM(street)) + ' - ' + addtst
     END ) AS fullstreet
  ,LTRIM(RTRIM(street)) AS street
  --,ISNULL(LTRIM(RTRIM(notes)), '') notes
  ,district
  ,case_id
  ,LTRIM(RTRIM(street)) + ', '
   + LTRIM(RTRIM(citydesc)) + ' FL, '
   + LTRIM(RTRIM(zip)) AS mapurl
   ,ISNULL(NMD.call_type, 'EMS') CallType
   ,ISNULL(NMD.is_emergency, 1) IsEmergency
   ,ISNULL(MNI.bottom_icon_url, '') NaturecodeIconURLBottom
   ,ISNULL(MNI.top_icon_url, '') NaturecodeIconURLTop
FROM
  cad.dbo.inmain I
  LEFT OUTER JOIN cad.dbo.nature N ON I.naturecode = N.naturecode
  LEFT OUTER JOIN Tracking.dbo.naturecode_meta_data NMD ON N.natureid = NMD.natureid
  LEFT OUTER JOIN Tracking.dbo.minicad_naturecode_icons MNI ON NMD.minicad_icon = MNI.id
WHERE
  case_id=@CaseID
ORDER  BY
  calltime DESC
  ,inci_id DESC 
"

      Try
        Dim au As New List(Of CADData.ActiveUnit)
        Dim Notes As New List(Of Note)
        Dim p(0) As SqlParameter
        p(0) = New SqlParameter("@CaseID", Data.SqlDbType.VarChar) With {.Value = CaseID}

        Dim DS As DataSet = D.Get_Dataset(query, "CAD", p)
        Dim L As New List(Of CADData.CaDCall)(From dbRow In DS.Tables(0).AsEnumerable()
                                              Select c.GetCallByDataRow(dbRow, au, Notes))
        If L.Count() > 0 Then
          Return L.First
        End If
        Return Nothing
      Catch ex As Exception
        Tools.Log(ex, CADData.AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

    Public Function GetStaffingFromTelestaffForCall(StartTime As Date, EndTime As Date) As List(Of CADData.Telestaff_Staff)
      ' This is not going to work very well, I will need to use each Unit's dispatch time 
      ' rather than a general call start time
      ' What I might do is just pull all of the entries for all units between
      ' the call's start and end time and then manually compare the unit dispatch time with those ranges.
      Dim c As New CADData()
      Dim ts_dp As New DynamicParameters
      Dim up_dp As New DynamicParameters
      ts_dp.Add("@Start", StartTime)
      up_dp.Add("@Start", StartTime)
      Dim query As String = "
SELECT
  CASE
    WHEN LEFT(U.unit_abrv_ch
              ,2) = 'BC'
    THEN 'BAT' + RIGHT(U.unit_abrv_ch, 1)
    ELSE
      CASE
        WHEN U.unit_abrv_ch = 'R22ABLE'
        THEN 'R22A'
        ELSE U.unit_abrv_ch
      END
  END AS Unit
  ,P.pos_desc_ch + ' ' + ISNULL(RM.rscmaster_name_ch
          ,'') Staff
  ,ST_EST.staffing_start_dt_est staffing_start_dt
  ,ST_EST.staffing_end_dt_est staffing_end_dt
  ,W.wstat_abrv_ch
  ,CAST(P.pos_desc_ch AS CHAR(20)) Position
  ,P.pos_no_in ListOrder
FROM
  Staffing_tbl S
  INNER JOIN vw_staffing_tbl_est ST_EST ON S.staffing_no_in = ST_EST.staffing_no_in
  LEFT OUTER JOIN Resource_Tbl R ON S.rsc_no_in = R.rsc_no_in
  LEFT OUTER JOIN resource_master_tbl RM ON R.RscMaster_No_In = RM.RscMaster_No_In
  JOIN Wstat_Cde_Tbl W ON W.Wstat_No_In = S.Wstat_No_In
  JOIN Position_Tbl P ON P.Pos_No_In = S.Pos_No_In
  JOIN Unit_Tbl U ON U.Unit_No_In = P.Unit_No_In
  JOIN Wstat_Type_Tbl WT ON WT.Wstat_Type_No_In = W.Wstat_Type_No_In
WHERE
  ST_EST.staffing_start_dt_est < @Start
  AND ST_EST.staffing_end_dt_est > @Start
  AND UPPER(U.unit_abrv_ch) NOT IN ( 'ADM', 'LOGS', 'TR', 'CCU',
                                     'EM', 'PREV', 'HG', 'PR' )
  AND UPPER(W.wstat_abrv_ch) NOT IN ( 'SWAP', 'V', 'OTR', 'ORD',
                                      'ADW', 'ADM', 'DH', 'DL',
                                      'DSWAP', 'DSL', 'EL', 'H',
                                      'HS', 'LWP', 'ML', 'NWOR',
                                      'OR', 'OJI', 'S', 'SLOT',
                                      'SLWP', 'UTP', 'VS', 'WC',
                                      'ST', 'OTLR', 'HP', 'OTLC',
                                      'HA', 'HU', 'OTRR', 'VBC',
                                      'ORRD', 'SA', 'SS', 'OTEMSC',
                                      'OTQAC', 'OTTC', 'OTMDAC', 'OTAC',
                                      'OTJC', 'OTARC', 'OTFC', 'OTWC',
                                      'OTHMT', 'OTHMI', 'OTSOT', 'OTSOI',
                                      'OTI', 'OTHGT', 'OTHGE', 'OTEMST',
                                      'OTFT', 'OTSP', 'BR', 'HBC',
                                      'OJISWAP', 'ADMNSWAP', 'ST', 'OTSWAT',
                                      'OTDT', 'OTSPD', 'OTCP' )
  AND UPPER(WT.wstat_type_desc_ch) NOT IN ( 'NON WORKING' )
ORDER  BY
  U.unit_abrv_ch ASC
  ,P.pos_no_in ASC "
      Try
        Dim tmp = c.Get_Data(Of CADData.Telestaff_Staff)(query, ts_dp, c.CST)

        ' Now we need to handle an outlier type of unit. E/L20, what we're going to do is just break out the users
        ' assigned to E/L20 (or generically anything with a "/") and then assign them to both
        Dim unitnumberRegex = "(?<unitnumber>\d+)"
        Dim staff = (From t In tmp Where t.Unit.Contains("/") Select t)
        Dim tmp2 As New List(Of CADData.Telestaff_Staff)
        For Each s In staff
          Dim matches = Regex.Matches(s.Unit, unitnumberRegex)
          If matches.Count() > 0 Then
            Dim unitnumber = matches.Item(0).Groups("unitnumber").Value
            Dim test = s.Unit.Replace(unitnumber, "").Split("/")
            s.Unit = test(0) & unitnumber
            For i As Integer = 1 To test.GetUpperBound(0)
              Dim x As New CADData.Telestaff_Staff
              x.Unit = test(i) & unitnumber
              x.Staff = s.Staff
              x.Position = s.Position
              x.ListOrder = s.ListOrder
              tmp2.Add(x)
            Next

          End If

        Next
        tmp.AddRange(tmp2)
        ' Now let's find the other units from the unitper table in CAD
        ' first we're going to get a list of the units already returned from Telestaff so we'll know we can exclude those
        Dim unitperQuery As String = "
SELECT 
  primekey ListOrder
  ,unitcode Unit
  ,name Staff
  ,'' Position
FROM unitper
WHERE
  outtime > @Start
  AND DATEDIFF(hh
               ,intime
               ,@Start) < 25
  AND LEFT(unitcode
           ,5) <> 'CHIEF' 
ORDER BY unitcode ASC, primekey ASC
"

        Dim cadstaff = c.Get_Data(Of CADData.Telestaff_Staff)(unitperQuery, up_dp, c.CAD)
        Dim currentunits = (From t In tmp Select t.Unit).Distinct().ToList
        tmp.AddRange((From cs In cadstaff
                      Where Not currentunits.Contains(cs.Unit)
                      Select cs).ToList)

        Return tmp
      Catch ex As Exception
        Tools.Log(ex, CADData.AppID, MachineName, Tools.Logging.LogType.Database)
        Return Nothing
      End Try
    End Function

  End Class



End Namespace