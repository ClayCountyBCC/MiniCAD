' This unfortunate class is necessary to stop MiniCAD from sending hundreds of error emails per minute when the network goes down'
' The original errorlog code cannot be modified as it is a DLL and the original sourcecode was lost. The solution used here is to'
' funnel all error log traffic through this class.'

Namespace Utils
    Public Class NewErrorLog
        Public Shared Property MaxEmailsPerMinute = 5

        Public Shared Sub Log(Ex As Exception, ApplicationID As Integer, Query As String, Logtype As Tools.LogType)
            Static previousTimesSentQueue = New RollingQueue(Of DateTime)(MaxEmailsPerMinute)
            Dim previousTimesSent = previousTimesSentQueue.ToArray()
            Dim currentTime = DateTime.Now
            Dim emailIsClearedToSend = False

            'Check the current time against the previous times. If they are all occuring within a minute, don't send the email
            For Each previousTime As DateTime In previousTimesSent
                Dim dateTimeDifference As TimeSpan = currentTime - previousTime
                Dim minutesDifference As Double = dateTimeDifference.TotalMinutes

                If minutesDifference > 1 Then
                    emailIsClearedToSend = True
                End If
            Next

            'If there are < MaxEmailsPerMinute in the Queue, then we know whe haven't reached the cap
            If previousTimesSent.Length < MaxEmailsPerMinute Then
                emailIsClearedToSend = True
            End If

            'Send the email
            If emailIsClearedToSend Then
                previousTimesSentQueue.Enqueue(currentTime)
                NewErrorLog.Log(Ex, ApplicationID, Query, Logtype)
                'Debug.WriteLine("Sent email at " + currentTime)
            End If

        End Sub
    End Class
End Namespace