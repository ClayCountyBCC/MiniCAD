Public Class HistoricalCall
  Public Property IncidentID As String ' This is the inci_id from CAD
  Public Property NatureCode As String ' The reason for the call
  Public Property Street As String ' a trimmed street field.
  Public Property CallTime As DateTime ' The calltime field in CAD
  Public Property CCFR As String = ""
  Public Property Notes As List(Of Note)

  Public ReadOnly Property FormattedCallTime As String
    Get
      Return CallTime.Month.ToString & "/" & CallTime.Day.ToString & " " & CallTime.ToShortTimeString
    End Get
  End Property
  Public ReadOnly Property LongCallTime As String
    Get
      Return CallTime.ToString
    End Get
  End Property
End Class
