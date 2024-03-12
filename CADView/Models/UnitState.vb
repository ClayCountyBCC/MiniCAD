Namespace Models
  Public Class UnitState
    Public Property unitcode As String
    Public Property staff As List(Of Telestaff_Staff) = New List(Of Telestaff_Staff)
    Public ReadOnly Property is_primary As Boolean
      Get
        Return staff.Count > 0
      End Get
    End Property
    Public ReadOnly Property is_active As Boolean
      Get
        Return is_primary Or current_incident.Length > 0
      End Get
    End Property
    Public Property is_available As Boolean = True
    Public Property is_visible As Boolean = True
    Public Property is_broke As Boolean = False
    Public Property using_unit As String = ""
    Public Property home_district As String = ""
    Public Property current_district As String = ""
    Public Property current_location As String = ""
    Public Property current_incident As String = ""
    Public Property current_status_display As String = ""
    Public Property locations As List(Of UnitLocation) = New List(Of UnitLocation)


  End Class
End Namespace

