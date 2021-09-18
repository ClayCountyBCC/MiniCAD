Imports Dapper

Namespace Models


  Public Class CadCallerLocation
    Public Property IncidentID As String
    Public Property LocationTime As Date
    Public Property Latitude As Decimal
    Public Property Longitude As Decimal
    Public Property Confidence As String
    Public Property CallStartTime As Date
    Public ReadOnly Property ToUSNG As String
      Get
        If Latitude <> 0 Then
          Dim x As New CADData
          Return x.Convert_LatLong_To_USNG(Latitude, Longitude)
        Else
          Return ""
        End If
      End Get
    End Property
    Public ReadOnly Property SecondsSinceStart As Integer
      Get
        Return LocationTime.Subtract(CallStartTime).TotalSeconds
      End Get
    End Property
    ' Need to get Caller USNG

    Public Shared Function GetCadCallerLocationsByPeriod(StartTime As Date, EndTime As Date) As List(Of CadCallerLocation)
      Dim query As String = "
WITH PhoneLocation
     AS (SELECT
           proctime
           ,LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(A.phonenum
                                                        ,'('
                                                        ,'')
                                                ,')'
                                                ,'')
                                        ,' '
                                        ,'')
                                ,'-'
                                ,''))) AS phonenumfixed
           ,LTRIM(RTRIM(latitude)) latitude
           ,LTRIM(RTRIM(longitude)) longitude
           ,LTRIM(RTRIM(confidence)) confidence
         FROM
           anialihs A)
SELECT  
  @OriginalStart CallStartTime
  ,I.inci_id IncidentID
  ,P.proctime location_time
  ,P.latitude Latitude
  ,P.longitude Longitude
  ,P.confidence Confidence
FROM
  inmain I
  INNER JOIN PhoneLocation P ON I.callerph = P.phonenumfixed
                                AND P.proctime BETWEEN @Start AND @End
ORDER  BY
  proctime ASC "
      Dim dp As New DynamicParameters
      dp.Add("@Start", StartTime.AddMinutes(-5))
      dp.Add("@OriginalStart", StartTime)
      dp.Add("@End", EndTime)
      Dim c As New CADData()
      Return c.Get_Data(Of CadCallerLocation)(query, dp, c.CAD)
    End Function

  End Class
End Namespace