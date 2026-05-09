window.ABCAdmin = window.ABCAdmin || {};

$(document).ready(function() {
  const csrfToken = $('meta[name="csrf-token"]').attr('content') || '';
  const pluralMap = {
    quiz: 'quizzes',
    category: 'categories',
    tag: 'tags',
    post: 'posts'
  };

  $(document).on('click', '.btn-delete', function() {
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

  window.ABCAdmin.toggleUserStatus = function(button) {
    const $btn = $(button);
    const id = $btn.data('id');
    if (!id) return;

    if ($btn.prop('disabled')) {
      return;
    }

    $btn.prop('disabled', true);

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
      },
      complete: function() {
        $btn.prop('disabled', false);
      }
    });
  };

  $(document).on('click', '.btn-toggle-user-status', function(event) {
    event.preventDefault();
    window.ABCAdmin.toggleUserStatus(this);
  });

  $(document).on('click', '.btn-toggle-subscriber-status', function() {
    const $btn = $(this);
    const id = $btn.data('id');
    if (!id) return;

    if ($btn.prop('disabled')) {
      return;
    }

    $btn.prop('disabled', true);

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
      },
      complete: function() {
        $btn.prop('disabled', false);
      }
    });
  });

  $(document).on('click', '.btn-toggle-sidebar', function() {
    $('.admin-sidebar').toggleClass('open');
  });
});
