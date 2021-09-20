Imports Dapper
Imports System.Environment

Namespace Models
  Public Class Telestaff_Staff
    Public Property Unit As String ' The unit assigned, will need to specially handle "E/L 20"
    Public Property Position As String = ""
    Public Property Staff As String ' a list of staff
    Public Property ListOrder As Integer ' The order to display the units in
    Public Property StartTime As Date
    Public Property EndTime As Date

    Public Shared Function GetCurrentStaffing() As List(Of Telestaff_Staff)
      Return GetStaffingBasedOnTime(DateTime.Now, DateTime.Now)
    End Function

    Public Shared Function GetStaffingBasedOnTime(StartTime As Date, EndTime As Date) As List(Of Telestaff_Staff)
      ' This is not going to work very well, I will need to use each Unit's dispatch time 
      ' rather than a general call start time
      ' What I might do is just pull all of the entries for all units between
      ' the call's start and end time and then manually compare the unit dispatch time with those ranges.
      Dim c As New CADData()
      Dim ts_dp As New DynamicParameters
      Dim up_dp As New DynamicParameters
      ts_dp.Add("@Start", StartTime)
      ts_dp.Add("@End", EndTime)
      up_dp.Add("@Start", StartTime)
      up_dp.Add("@End", EndTime)
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
  ,ST_EST.staffing_start_dt_est StartTime
  ,ST_EST.staffing_end_dt_est EndTime
  ,W.wstat_abrv_ch
  ,CAST(P.pos_desc_ch AS CHAR(20)) Position
  ,P.pos_no_in ListOrder
FROM
  Staffing_tbl S
  INNER JOIN vw_staffing_tbl_est ST_EST ON S.staffing_no_in = ST_EST.staffing_no_in
  LEFT OUTER JOIN Resource_Tbl R ON S.rsc_no_in = R.rsc_no_in
  LEFT OUTER JOIN resource_master_tbl RM ON R.RscMaster_No_In = RM.RscMaster_No_In
  LEFT OUTER JOIN Wstat_Cde_Tbl W ON W.Wstat_No_In = S.Wstat_No_In
  LEFT OUTER JOIN Position_Tbl P ON P.Pos_No_In = S.Pos_No_In
  LEFT OUTER JOIN Unit_Tbl U ON U.Unit_No_In = P.Unit_No_In
  LEFT OUTER JOIN Wstat_Type_Tbl WT ON WT.Wstat_Type_No_In = W.Wstat_Type_No_In
WHERE
  ST_EST.staffing_start_dt_est < @End
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
        Dim tmp = c.Get_Data(Of Telestaff_Staff)(query, ts_dp, c.CST)

        ' Now we need to handle an outlier type of unit. E/L20, what we're going to do is just break out the users
        ' assigned to E/L20 (or generically anything with a "/") and then assign them to both
        Dim unitnumberRegex = "(?<unitnumber>\d+)"
        Dim staff = (From t In tmp Where t.Unit.Contains("/") Select t)
        Dim tmp2 As New List(Of Telestaff_Staff)
        For Each s In staff
          Dim matches = Regex.Matches(s.Unit, unitnumberRegex)
          If matches.Count() > 0 Then
            Dim unitnumber = matches.Item(0).Groups("unitnumber").Value
            Dim test = s.Unit.Replace(unitnumber, "").Split("/")
            s.Unit = test(0) & unitnumber
            For i As Integer = 1 To test.GetUpperBound(0)
              Dim x As New Telestaff_Staff With {
                .Unit = test(i) & unitnumber,
                .Staff = s.Staff,
                .Position = s.Position,
                .ListOrder = s.ListOrder
              }
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
  ,intime StartTime
  ,ISNULL(outtime, GETDATE()) EndTime
FROM unitper
WHERE
  (outtime > @Start OR outtime IS NULL)
  AND DATEDIFF(hh
               ,intime
               ,@End) < 25
  AND LEFT(unitcode
           ,5) <> 'CHIEF' 
ORDER BY unitcode ASC, primekey ASC
"

        Dim cadstaff = c.Get_Data(Of Telestaff_Staff)(unitperQuery, up_dp, c.CAD)
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

