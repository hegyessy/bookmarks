const search = document.querySelector('#search');

// Restore the full list when the user deletes the query or uses the clear button.
search.addEventListener('input', () => {
  if (search.value === '' && new URLSearchParams(location.search).get('q')) {
    location.assign('/');
  }
});
