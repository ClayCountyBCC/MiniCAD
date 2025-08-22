Namespace Utils
    Public Class RollingQueue(Of T)
        Private ReadOnly _queue As New Queue(Of T)()
        Private ReadOnly _capacity As Integer

        Public Sub New(capacity As Integer)
            If capacity <= 0 Then
                Throw New ArgumentException("RollingQueue capacity must be greater than zero.")
            End If
            _capacity = capacity
        End Sub

        Public Sub Enqueue(item As T)
            If _queue.Count >= _capacity Then
                _queue.Dequeue() ' Remove oldest item
            End If
            _queue.Enqueue(item)
        End Sub

        Public Function Dequeue() As T
            Return _queue.Dequeue()
        End Function

        Public Function Peek() As T
            Return _queue.Peek()
        End Function

        Public ReadOnly Property Count As Integer
            Get
                Return _queue.Count
            End Get
        End Property

        Public Function ToArray() As T()
            Return _queue.ToArray()
        End Function
    End Class
End Namespace