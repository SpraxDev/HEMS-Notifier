function toFriendlyErr(str) {
  if (str) {
    switch (str) {
      case 'Already subscribed':
        return 'Diese Mailadresse befindet sich bereits in der Datenbank';
      case 'Invalid Address':
        return 'Die angegebene Mailadresse ist ungültig';
      default:
        break;
    }
  }

  return str || 'Bitte versuche es später noch ein Mal';
}

function onSubmit(e) {
  e.preventDefault();

  if (document.getElementById('chkbox').checked) {
    fetch('./subscribe?email=' + encodeURIComponent(document.getElementById('email').value))
      .then((res) => {
        return res.json();
      })
      .then((json) => {
        const elem = document.getElementById('result');

        elem.innerHTML = '';
        elem.classList.remove('alert-success', 'alert-danger');

        if (json['success']) {
          elem.classList.add('alert-success');
          elem.innerHTML = '<b>Erfolg</b><br>Du wirst in Kürze eine Mail erhalten, um deine Mailadresse zu bestätigen';
        } else {
          elem.classList.add('alert-danger');
          elem.innerHTML = '<b>Fehlschlag</b><br>' + toFriendlyErr(json['msg']);
        }

        console.log(json);
      });
  }
}