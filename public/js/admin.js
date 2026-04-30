$(document).ready(function() {
  const csrfToken = $('meta[name="csrf-token"]').attr('content') || '';
  const pluralMap = {
    quiz: 'quizzes',
    category: 'categories',
    tag: 'tags',
    post: 'posts'
  };

  $('.btn-delete').on('click', function() {
    const id = $(this).data('id');
    const type = $(this).data('type') || 'post';
    const url = '/admin/' + (pluralMap[type] || `${type}s`) + '/' + id;

    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          url: url,
          method: 'DELETE',
          headers: csrfToken ? {
            'x-csrf-token': csrfToken
          } : {},
          success: function() {
            Swal.fire('Deleted!', 'The ' + type + ' has been deleted.', 'success').then(() => {
              location.reload();
            });
          },
          error: function() {
            Swal.fire('Error!', 'Something went wrong.', 'error');
          }
        });
      }
    });
  });

  $('.btn-toggle-sidebar').on('click', function() {
    $('.admin-sidebar').toggleClass('open');
  });
});
