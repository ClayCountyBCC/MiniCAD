Namespace Models
  Public Class ActiveUnit
    Public Property UnitName As String ' The unit designation name
    Public Property UnitStatus As String ' The unit's current status.  This will be blank unless they are assigned to something.
    Public Property UnitType As String ' The kind of unit, ie: Tanker, rescue, Engine, Ladder, etc.
    Public Property IncidentID As String ' The inci_id this unit is assigned to.  This will be empty for most active units
    Public Property District As String ' This is the unit's current assigned geographic area.
    Public Property HomeStation As String ' The unit's home station
    Public Property PrimeOfficer As String ' This is the primary officer in charge of the unit.
    Public Property Location As String ' If there is a location set, it'll show it.
    Public Property Staff As List(Of String)
    Public Property GeoX As Double
    Public Property GeoY As Double
    Public Property Latitude As Double
    Public Property Longitude As Double
    Public Property Timestamp As Date = Date.MinValue
    Public Property Speed As Double
    Public Property Heading As Double
    Public Property LocationType As String = ""
    Public ReadOnly Property LocationStatus As String
      Get
        If Timestamp = Date.MinValue Then
          Return ""
        Else
          Select Case Now.Subtract(Timestamp).TotalMinutes
            Case Is < 11 ' 10 minutes / Green
              'Return "//static.arcgis.com/images/Symbols/Basic/GreenBeacon.png"
              Return "//static.arcgis.com/images/Symbols/Shapes/GreenSquareLargeB.png"
            Case Is < 241 ' 4 hours / Yellow
              'Return "//static.arcgis.com/images/Symbols/Basic/AmberBeacon.png"
              Return "//static.arcgis.com/images/Symbols/Shapes/YellowSquareLargeB.png"
            Case Is < 721 ' 12 hours / Orange
              'Return "//static.arcgis.com/images/Symbols/Basic/OrangeBeacon.png"
              Return "//static.arcgis.com/images/Symbols/Shapes/OrangeSquareLargeB.png"
            Case Is < 1441 ' 24 hours / Red
              'Return "//static.arcgis.com/images/Symbols/Basic/RedBeacon.png"
              Return "//static.arcgis.com/images/Symbols/Shapes/RedSquareLargeB.png"
            Case Else ' < 20160 ' 2 weeks / Black
              'Return "//static.arcgis.com/images/Symbols/Basic/BlackBeacon.png"
              Return "//static.arcgis.com/images/Symbols/Shapes/BlackSquareLargeB.png"
              'Case Else
              '    Return ""
          End Select
        End If
      End Get
    End Property


  End Class
End Namespace

