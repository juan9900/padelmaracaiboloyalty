const userForm = document.getElementById("user-form");

const LL_API_KEY = "5dq14Qw1WN8TG4ViSLajc5";
const LL_API_SECRET =
  "vQozH0MOT4wxAo0jo7eonuPRd49UOEImBquMWefAa3hPWwQoaqpWY4C7uGZ8Q1vs";
const LL_USERNAME = "padelmaracaibo";
// TODO: Cambiar TERMS_URL y URL_PROGRAM ycambiar el link del webhook en el post

let jwt = "";
const URL_PROGRAM = "7DeR8g9GE04UYJTQKftuDd";
const TERMS_URL = `https://api.loopyloyalty.com/v1/campaign/id/${URL_PROGRAM}`;
const URL_ENROLL = `https://api.loopyloyalty.com/v1/enrol/${URL_PROGRAM}`;
const URL_CHECK = "https://hook.us1.make.com/16yheio4dmz7daw59iys6hpssdhb9r8t";
const URL_ADD = "https://hook.us1.make.com/tlcds0jct2gj3r382z3rzl679xsy1xof";

const termsContainer = document.getElementById("terms-container");
const priceContainer = document.getElementById("price-container");
const registeredContainer = document.getElementById("registered-container");
const submitSpinner = document.getElementById("submit-spinner");
const submitButton = document.getElementById("submit-btn");

async function enrollUser(url = "", data = {}, key) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: key,
      },
      body: JSON.stringify(data),
    });
  } catch (e) {
    submitButton.disabled = false;
    submitSpinner.classList.add("d-none");
    console.log(e);
    return e;
  }

  return response.json();
}

async function callWebhook(url = "", data = {}) {
  let response = "";
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        // Add CORS headers to allow requests from any origin
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(data),
    });

    return response.json();
  } catch (e) {
    console.log(e);
    submitButton.disabled = false;
    submitSpinner.classList.add("d-none");
    return false;
  }
}

async function addUser(url = "", data = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      // Add CORS headers to allow requests from any origin
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

const retrieveTerms = async () => {
  jwt = generateJWT(LL_API_KEY, LL_API_SECRET, LL_USERNAME);
  console.log(jwt);

  const response = await fetch(TERMS_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: jwt,
    },
  });
  return await response.json();
};

document.addEventListener("DOMContentLoaded", async function () {
  const phoneInputField = document.querySelector("#numero");
  const phoneInput = window.intlTelInput(phoneInputField, {
    initialCountry: "ve",
    utilsScript:
      "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
  });

  const resp = await retrieveTerms();
  const { terms, description } = resp;
  console.log(resp);

  priceContainer.innerHTML = description;

  const termsArray = terms.split("\n");

  // Create an HTML structure to display each term in a separate paragraph
  const termsHTML = termsArray.map((term) => `<p>${term.trim()}</p>`).join("");

  // Display the terms in the terms container
  termsContainer.innerHTML = termsHTML;

  userForm.addEventListener("submit", (event) => {
    console.log("submitted");
    event.preventDefault();
    // if the checkbox is not checked then display an error message and return

    submitButton.disabled = true;
    submitSpinner.classList.remove("d-none");
    registeredContainer.innerText = "";
    const valid = validateForm();
    console.log({ valid });

    let name = document.getElementById("nombre").value;
    let email = document.getElementById("correo").value;
    let phone = phoneInput.getNumber();
    let terms = document.getElementById("terms-check").checked;

    // if the terms is not checked, then display an error message and return
    if (!terms) {
      registeredContainer.innerText =
        "Debes aceptar los términos y condiciones para poder registrarte.";
      submitButton.disabled = false;
      submitSpinner.classList.add("d-none");
      return;
    }
    if (!valid || name === "" || email === "" || phone === "") {
      registeredContainer.innerText =
        "Ocurrió un error, verifica los datos e inténtalo de nuevo.";
      submitButton.disabled = false;
      submitSpinner.classList.add("d-none");
      return;
    }
    let payload = {
      customerData: {
        Nombre: name,
        "Número telefónico": phone,
        "Correo electrónico": email,
      },
      dataConsentOptIn: true,
    };

    // Generates the jwt token from an api key, secret &username

    jwt = generateJWT(LL_API_KEY, LL_API_SECRET, LL_USERNAME);

    //Check if the user is already registered
    callWebhook(URL_CHECK, payload)
      .then((data) => {
        const { isRegistered } = data;
        console.log(isRegistered);
        if (isRegistered) {
          registeredContainer.innerText =
            "Ya te encuentras registrado, verifica tu correo si necesitas recuperar tu tarjeta.";

          throw new Error("User is already registered");
        } else {
          console.log("no registrado");
          enrollUser(URL_ENROLL, payload, jwt).then((data) => {
            console.log(data);
            if (data.error?.includes("is not valid")) {
              registeredContainer.innerText =
                "El correo electrónico no es válido, por favor utiliza uno diferente.";
              submitButton.disabled = false;
              submitSpinner.classList.add("d-none");
              return;
            }
            const { pid, url: cardLink } = data;
            console.log({ pid, cardLink });
            const hookPayload = { ...payload, pid, cardLink };
            addUser(URL_ADD, hookPayload).then((data) => {
              console.log(data);
              // const { ok, url } = data;
              if (!data.ok) {
                registeredContainer.innerText =
                  "Ocurrió un error, verifica los datos e intentalo de nuevo";
                return;
              }
              window.location.href = data.url;
              submitButton.disabled = false;
              submitSpinner.classList.add("d-none");
            });
          });
        }
      })
      .catch((e) => {
        console.log(e);
        submitButton.disabled = false;
        submitSpinner.classList.add("d-none");
      });
  });
});

function generateJWT(key, secret, username) {
  var body = {
    uid: key,
    exp: Math.floor(new Date().getTime() / 1000) + 3600,
    iat: Math.floor(new Date().getTime() / 1000) - 10,
    username: username,
  };

  header = {
    alg: "HS256",
    typ: "JWT",
  };
  var token = [];
  token[0] = base64url(JSON.stringify(header));
  token[1] = base64url(JSON.stringify(body));
  token[2] = genTokenSign(token, secret);

  return token.join(".");
}

function genTokenSign(token, secret) {
  if (token.length != 2) {
    return;
  }
  var hash = CryptoJS.HmacSHA256(token.join("."), secret);
  var base64Hash = CryptoJS.enc.Base64.stringify(hash);
  return urlConvertBase64(base64Hash);
}

function base64url(input) {
  var base64String = btoa(input);
  return urlConvertBase64(base64String);
}

function urlConvertBase64(input) {
  var output = input.replace(/=+$/, "");
  output = output.replace(/\+/g, "-");
  output = output.replace(/\//g, "_");

  return output;
}

function validateForm() {
  "use strict";

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");

  // Loop over them and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        let allInputsValid = true; // Initialize the flag as true
        const inputs = form.querySelectorAll(".form-control"); // Assuming "form-control" is the class for your input elements
        inputs.forEach((input) => {
          if (
            !input.checkValidity() &&
            !input.hasAttribute("data-validation-ignore")
          ) {
            allInputsValid = false; // Set the flag to false if at least one input is invalid
          }
        });

        form.classList.add("was-validated");

        if (!allInputsValid) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      },
      false
    );
  });
  return true;
}
