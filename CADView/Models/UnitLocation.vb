Namespace Models

  Public Class UnitLocation
    Public Property unitcode As String
    Public Property location_type As String = "" ' AVL / CAD / GT
    Public Property latitude As Decimal = 0
    Public Property longitude As Decimal = 0
    Public Property bearing As Integer = -1
    Public Property speed As Integer = -1
    Public Property updated_on As DateTime

  End Class

End Namespace

