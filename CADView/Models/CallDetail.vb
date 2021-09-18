Namespace Models


  Public Class CallDetail
    ' This class will contain the incilog detail data for a particular inci_id, it will be populated
    ' when the user clicks on the inci_id.
    Public Property LogID As Long ' The primary key of the row.  This field is the logid in the log table, and the incilogid in the incilog table.
    Public Property NoteID As Long = 0 ' If this detail object was created from a note, this will be the ID of that note.
    Public Property IncidentID As String ' The incidentID for the call
    Public Property UserID As String ' The userid field in incilog
    Public Property Unit As String ' The Unit's code identifier.
    Public Property Description As String ' The descript field in incilog
    Public Property Timestamp As DateTime ' The timestamp field in incilog, the time when something happened
    Public ReadOnly Property FormattedTimestamp As String
      Get
        Return Timestamp.Month.ToString & "/" & Timestamp.Day.ToString & " " & Timestamp.ToShortTimeString
      End Get
    End Property
    Public Property Comments As String ' Various text from incilog table 
    Public Property UserTyped As String ' usertyped field from incilog
  End Class

End Namespace
