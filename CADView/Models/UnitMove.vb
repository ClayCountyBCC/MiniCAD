Imports Dapper

Namespace Models

  Public Class UnitMove
    Public Property unitcode As String
    Public Property comments As String
    Public Property new_district As String

    Public Shared Function GetAllUnitsByCaseID(CaseID As String) As List(Of UnitMove)
      Dim dp As New DynamicParameters
      dp.Add("@CaseID", CaseID)
      Dim query As String = "
DECLARE @Start DATETIME = (SELECT TOP 1
     calltime
   FROM
     cad.dbo.inmain
   WHERE
    case_id = @CaseID);
DECLARE @PriorToStart DATETIME = DATEADD(HOUR
          ,-12
          ,@Start);

WITH PriorMovesByUnit
     AS (SELECT
           U.unitcode
           ,(SELECT TOP 1
               LTRIM(RTRIM(comments))
             FROM
               cad.dbo.incilog H
             WHERE
              U.unitcode = H.unitcode
              AND H.timestamp BETWEEN @PriorToStart AND @Start
              AND U.show_in_minicad = 1
              AND H.transtype = 'MOVE'
             ORDER  BY
              timestamp DESC) comments
         FROM
           Tracking.dbo.unit_group U
         WHERE
          U.show_in_minicad = 1)
SELECT
  LTRIM(RTRIM(unitcode)) unitcode
  ,comments
  ,RIGHT(comments
         ,2) new_district
FROM
  PriorMovesByUnit
WHERE
  comments IS NOT NULL
  AND RIGHT(UPPER(comments)
            ,6) != '(HOME)'
  AND RIGHT(comments
            ,2) != '->' 
"
      Dim c As New CADData
      Return c.Get_Data(Of UnitMove)(query, dp, c.CAD)
    End Function

    Public Shared Function GetCallUnitsOnlyByCaseID(CaseID As String) As List(Of UnitMove)
      Dim dp As New DynamicParameters
      dp.Add("@CaseID", CaseID)
      Dim query As String = "
DECLARE @IncidentID VARCHAR(14);
DECLARE @Start DATETIME;

SELECT TOP 1
  @IncidentID = inci_id
  ,@Start = calltime
FROM
  cad.dbo.inmain
WHERE
  case_id = @CaseID;

DECLARE @PriorToStart DATETIME = DATEADD(HOUR
          ,-12
          ,@Start);

WITH Units AS (
  
  SELECT DISTINCT
    IL.unitcode
  FROM cad.dbo.incilog IL
  INNER JOIN Tracking.dbo.unit_tracking_data UTD ON IL.unitcode = UTD.unitcode
  WHERE
    inci_id=@IncidentID

), PriorMovesByUnit
     AS (SELECT
           U.unitcode
           ,(SELECT TOP 1
               LTRIM(RTRIM(comments))
             FROM
               cad.dbo.incilog H
               INNER JOIN Units UNIT ON H.unitcode = UNIT.unitcode
             WHERE
              U.unitcode = H.unitcode
              AND H.timestamp BETWEEN @PriorToStart AND @Start
              AND U.show_in_minicad = 1
              AND H.transtype = 'MOVE'                            
             ORDER  BY
              timestamp DESC) comments
         FROM
           Tracking.dbo.unit_group U
         WHERE
          U.show_in_minicad = 1)
SELECT
  LTRIM(RTRIM(unitcode)) unitcode
  ,comments
  ,RIGHT(comments
         ,2) new_district
FROM
  PriorMovesByUnit
WHERE
  comments IS NOT NULL
  AND RIGHT(UPPER(comments)
            ,6) != '(HOME)'
  AND RIGHT(comments
            ,2) != '->' 
"
      Dim c As New CADData
      Return c.Get_Data(Of UnitMove)(query, dp, c.CAD)
    End Function


  End Class
End Namespace