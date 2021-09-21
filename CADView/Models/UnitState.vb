﻿Namespace Models
  Public Class UnitState
    Public Property unitcode As String
    Public Property staff As List(Of Telestaff_Staff)
    Public Property is_available As Boolean
    Public Property is_visible As Boolean = True
    Public Property is_broke As Boolean = False
    Public Property is_available_out_of_district As Boolean = True
    Public Property home_district As String
    Public Property current_district As String
    Public Property current_location As String
    Public Property current_incident As String
    Public Property current_status As String



  End Class
End Namespace
