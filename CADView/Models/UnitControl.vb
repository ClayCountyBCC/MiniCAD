Imports System.Data.SqlClient
Imports System.Runtime.Caching
Imports CADView.Models
Imports Dapper
Public Class UnitControl
  Public Property unitcode As String
  Public Property group_name As String
  Public Property show_in_minicad As Boolean
  Public Property is_primary_unit As Boolean
  Sub New()
  End Sub

  Public Shared Function GetUnits() As List(Of UnitControl)
    Dim query As String = $"
      USE Tracking;
      SELECT
	      unitcode
	      ,group_name
	      ,show_in_minicad
	      ,is_primary_unit
      FROM Tracking.dbo.vwUnitControlAllUnits
      ORDER BY CASE WHEN group_name = '' THEN 'zzzzzz' ELSE group_name END, unitcode
"
    Dim C As New CADData()
    Return C.Get_Data(Of UnitControl)(query, C.CAD)
  End Function

  Public Function SaveUnit(uc As UnitControl, username As String) As Boolean
    Dim dp As New DynamicParameters()
    dp.Add("@unitcode", uc.unitcode)
    dp.Add("@group_name", uc.group_name)
    dp.Add("@show_in_minicad", uc.show_in_minicad)
    dp.Add("@is_primary_unit", uc.is_primary_unit)
    dp.Add("@username", username)
    Dim query As String = $"
        SET XACT_ABORT ON;
        USE Tracking;

        MERGE Tracking.dbo.unit_group AS UG
        USING (
          VALUES (
            @unitcode
            , @group_name
            , @show_in_minicad
            , @is_primary_unit
            , @username
            )
        ) AS UCD (unitcode, group_name, show_in_minicad, is_primary_unit, username) 
        ON UCD.unitcode = UG.unitcode

        WHEN MATCHED THEN
          
          UPDATE 
          SET
            group_name = UCD.group_name
            ,show_in_minicad = UCD.show_in_minicad
            ,is_primary_unit = UCD.is_primary_unit

        WHEN NOT MATCHED THEN

          INSERT 
            (unitcode
            ,group_name
            ,show_in_minicad
            ,is_primary_unit)
          VALUES (
            LTRIM(RTRIM(UCD.unitcode))
            ,UCD.group_name
            ,UCD.show_in_minicad
            ,UCD.is_primary_unit
          );

          INSERT INTO unit_group_history (
            unitcode
            ,group_name
            ,show_in_minicad
            ,is_primary_unit
            ,updated_by_user
            ,updated_on
            )
            SELECT
              @unitcode
              ,@group_name
              ,@show_in_minicad
              ,@is_primary_unit
              ,@username
              ,GETDATE();"

    Dim CD As New CADData()
    Try
      Using db As IDbConnection = New SqlConnection(CD.CAD)
        Dim i = db.Execute(query, dp)
        Return i > 0
      End Using
    Catch ex As Exception
      Tools.Log(ex, CADData.AppID, "", Tools.Logging.LogType.Database)
      Return False
    End Try
  End Function

  Public Shared Function GetAccessUsers() As List(Of String)
    '
    Return New List(Of String) From
{
"mccartneyd",
"devink",
"segarsj"
}
  End Function

  Public Shared Function GetUnitControlHistory() As List(Of UnitControlHistory)
  End Function

  Public Shared Function CheckAccess(name As String) As Boolean
    Dim AccessCIP As New CacheItemPolicy With {
.AbsoluteExpiration = Now.AddHours(8)
}

    Dim accesslist As List(Of String) = myCache.GetItem("UnitControlAccess", AccessCIP)
    Return accesslist.Contains(name.ToLower().Replace("claybcc\", ""))
  End Function

End Class
