Namespace Models
  Public Class Advisory
    Property Title As String
    Property Location As String
    Property Notes As String
    Property ExpirationDate As Date
    Property DateAdded As Date = Today
    ReadOnly Property ShortDateAdded As String
      Get
        Return DateAdded.ToShortDateString
      End Get
    End Property
    ReadOnly Property ShortExpirationDate As String
      Get
        Return ExpirationDate.ToShortDateString
      End Get
    End Property

    Public Shared Function GetActiveAdvisories() As List(Of Advisory)
      Dim query As String = "
USE cad;

SELECT
  ISNULL(expires
         ,'12/31/9999') ExpirationDate
  ,addtime DateAdded
  ,ISNULL(title
          ,'') Title
  ,ISNULL(location
          ,'') Location
  ,ISNULL(notes
          ,'') Notes
FROM
  cad.dbo.advisory
WHERE
  status = 'ACTIVE'
  AND ( expires > GETDATE()
         OR expires IS NULL )
ORDER  BY
  title ASC "
      Dim c As New CADData
      Return c.Get_Data(Of Advisory)(query, c.CAD)

    End Function

  End Class
End Namespace
