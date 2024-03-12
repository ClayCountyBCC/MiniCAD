Imports CADView.Models
Imports Dapper

Public Class UnitControlHistory
  Public Property id As Long
  Public Property unitcode As String
  Public Property show_in_minicad As Boolean
  Public Property is_primary_unit As Boolean
  Public Property changed_by_user As String
  Public Property changed_on As Date


  Sub New()
  End Sub

  Public Shared Function GetUnitControlHistory(unitcode As String) As List(Of UnitControlHistory)
    Dim dp As New DynamicParameters()
    dp.Add("@unitcode", unitcode)
    Dim query As String = $"
	  SELECT TOP 100
		  id
		  ,unitcode
		  ,group_name
		  ,show_in_minicad
		  ,is_primary_unit
		  ,updated_by_user
		  ,updated_on
	  FROM Tracking.dbo.unit_group_history
	  WHERE
		unitcode = @unitcode
	  ORDER BY id DESC
"
    Dim C As New CADData()
    Return C.Get_Data(Of UnitControlHistory)(query, dp, C.CAD)
  End Function

End Class
