$(document).ready(function() {
  const csrfToken = $('meta[name="csrf-token"]').attr('content') || '';
  const pluralMap = {
    quiz: 'quizzes',
    category: 'categories',
    tag: 'tags',
    post: 'posts'
  };

  $('.btn-delete').on('click', function() {
    const $btn = $(this);
    const id = $btn.data('id');
    const type = $btn.data('type') || 'post';
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
              const redirect = $btn.data('redirect');
              if (redirect) {
                window.location.href = redirect;
                return;
              }
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

  $('.btn-toggle-user-status').on('click', function() {
    const $btn = $(this);
    const id = $btn.data('id');
    if (!id) return;

    $.ajax({
      url: '/admin/users/' + id + '/toggle-status',
      method: 'POST',
      headers: csrfToken ? {
        'x-csrf-token': csrfToken
      } : {},
      success: function(response) {
        const isActive = Boolean(response && response.isActive);
        $btn
          .toggleClass('bg-success', isActive)
          .toggleClass('bg-secondary', !isActive)
          .text(isActive ? 'Active' : 'Inactive');
        Swal.fire('Updated!', response?.message || 'User status updated.', 'success');
        setTimeout(() => window.location.reload(), 400);
      },
      error: function(xhr) {
        const message = xhr?.responseJSON?.error || 'Could not update user status.';
        Swal.fire('Error!', message, 'error');
      }
    });
  });

  $('.btn-toggle-subscriber-status').on('click', function() {
    const $btn = $(this);
    const id = $btn.data('id');
    if (!id) return;

    $.ajax({
      url: '/admin/subscribers/' + id + '/toggle-status',
      method: 'POST',
      headers: csrfToken ? {
        'x-csrf-token': csrfToken
      } : {},
      success: function(response) {
        const isActive = String(response && response.status || '') === 'active';
        $btn
          .toggleClass('bg-success', isActive)
          .toggleClass('bg-secondary', !isActive)
          .text(isActive ? 'Active' : 'Unsubscribed');
        Swal.fire('Updated!', response?.message || 'Subscriber status updated.', 'success');
        setTimeout(() => window.location.reload(), 400);
      },
      error: function(xhr) {
        const message = xhr?.responseJSON?.error || 'Could not update subscriber status.';
        Swal.fire('Error!', message, 'error');
      }
    });
  });

  $('.btn-toggle-sidebar').on('click', function() {
    $('.admin-sidebar').toggleClass('open');
  });
});
