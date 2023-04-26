const darkBtn = document.getElementById("butnDrk");
const lightBtn = document.getElementById("butnLgt");
const data = JSON.parse(document.currentScript.getAttribute("data"));
window.addEventListener("load", () => darkMode());

const darkMode = () => {
  document.documentElement.classList.add("dark");
  document.documentElement.classList.remove("light");
  darkBtn.style.display = "none";
  lightBtn.style.display = "block";
};
const lightMode = () => {
  document.documentElement.classList.add("light");
  document.documentElement.classList.remove("dark");
  darkBtn.style.display = "block";
  lightBtn.style.display = "none";
};

const model_container = document.querySelector(".model_container");
const model = document.querySelector("#model");

function toggleModel(name, link) {
  model.innerHTML = "";
  console.log("length", link.length);
  const h1 = document.createElement("h1");
  h1.classList.add("model_heading");
  h1.innerHTML = name;

  model.appendChild(h1);
  console.log(link);
  link.forEach((item) => {
    var datacard = inputCard(item);
    model.appendChild(datacard);
    console.log(datacard);
  });
  model_container.classList.add("show");
}

function hideModel() {
  model_container.classList.remove("show");
}

function inputCard(data) {
  // Create a div element
  const div = document.createElement("div");
  div.classList.add("input_section");

  // Create an input element
  const input = document.createElement("input");
  input.classList.add("model_input");
  input.type = "text";
  input.value = data;
  input.disabled = true;
  input.name = "";
  input.id = "";

  // Create an i element
  // const i = document.createElement("i");
  // i.classList.add("fa", "fa-copy");

  // Append input and i elements to the div element
  div.appendChild(input);
  // div.appendChild(i);

  // Return the div element as an HTML string
  return div;
}

const personData = {
  name: data?.profile?.name,
  email: data?.contact?.contacts[1]?.value,
  company: data?.profile?.companyName,
  position: data?.profile?.designation,
  phone: data?.contact?.contacts[0]?.value,
};

const createVcard = () => {
  const vcardData = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${personData.name}`,
    `EMAIL;TYPE=WORK:${personData.email}`,
    `ORG:${personData.company}`,
    `TITLE:${personData.position}`,
    `ADR;TYPE=WORK:;;${personData.address}`,
    `TEL;TYPE=CELL:${personData.phone}`,
    "END:VCARD",
  ].join("\n");

  const blob = new Blob([vcardData], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);

  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = `${personData.name}.vcf`;
  downloadLink.click();

  // Release the object URL after the download has started
  URL.revokeObjectURL(url);
};

// setup dynamic data from backend

const name = document.getElementById("name");
const email = document.getElementById("email");
const phone = document.getElementById("phone");
const address = document.getElementById("address");
const website = document.getElementById("website");
const position = document.getElementById("position");
const company = document.getElementById("company");
const bio = document.getElementById("bio");

// ----
// Check if social media data is available

const socialMedia = data?.social;

// Create an empty HTML string
let socialMediaHTML = "";

// Loop through each social media object in the list
for (const social of socialMedia.socials) {
  // Check if the social media value is available
  if (social.value !== "") {
    // Build the social media link HTML
    let iconClass = "";
    switch (social.type) {
      case "instagram":
        iconClass = "fa-brands fa-instagram ins";
        break;
      case "linkedin":
        iconClass = "fa-brands fa-linkedin-in";
        break;
      case "twitter":
        iconClass = "fa-brands fa-twitter";
        break;
      default:
        iconClass = "fa-solid fa-link";
    }
    socialMediaHTML += `
      <a href="https://${social.value}" class="image sm-icons">
        <i class="${iconClass}" style="color: #7c56fe;"></i>
      </a>
    `;
  }
}

// Render the social media section
const socialMediaSection = document.getElementById("social-media-section");
socialMediaSection.innerHTML = socialMedia.status
  ? `
  <div class="sm-section section">
    <h3 class="sm-head head">Social Media</h3>
    <hr />
    <div class="sm-icons">
      ${socialMediaHTML}
    </div>
  </div>
`
  : "";

// // ---

// ----
// Check if social media data is available

const contactsData = data?.contact?.contacts;

let contactVisible = data?.contact?.status;

if (!contactVisible || contactsData.length === 0) {
  document.getElementsByClassName("contacts-section")[0].style.display = "none";
}

const contactsIconsDiv = document.getElementById("contacts-icons");

contactsData.forEach((data) => {
  const button = createButton(data.type, data.value);
  contactsIconsDiv.appendChild(button);
});
function createButton(type, value) {
  const button = document.createElement("button");
  button.classList.add("image");

  const icon = document.createElement("i");
  if (type === "phone") {
    icon.classList.add("fa-solid", "fa-phone");
    button.onclick = () => window.open(`tel:${value}`);
  } else if (type === "email") {
    icon.classList.add("fa-solid", "fa-at");
    button.onclick = () => window.open(`mailto:${value}`);
  } else if (type === "location") {
    icon.classList.add("fa-solid", "fa-location-dot");
    button.onclick = () => {
      toggleModel("Address", value);
    };
  } else if (type === "whatsapp") {
    icon.classList.add("fa-brands", "fa-whatsapp");
    button.onclick = () => window.open(`https://wa.me/${value}`);
  } else if (type === "wabusiness") {
    const img = document.createElement("img");
    img.src = "/images/wb.svg";
    img.alt = "WhatsApp Business";
    button.appendChild(img);
    button.onclick = () => window.open(`https://wa.me/${value}`);
  }
  icon.style.color = "#7c56fe";

  button.appendChild(icon);

  return button;
}

// ---

// example data, replace with your own
const linksData = data?.website?.websites;

let linkStatus = data?.website?.status;

if (!linkStatus || linksData.length == 0) {
  document.getElementsByClassName("websites-section")[0].style.display = "none";
}

// function to generate link card HTML for a single link
function generateLinkCard(linkData) {
  return `
    <div class="link-card">
      <p class="link">${linkData.link}</p>
      <button class="image" onclick="window.open('${linkData.link}', '_blank')">
        <img src="/images/arrow_outward.svg" alt="" class="arrow">
      </button>
    </div>
  `;
}

// generate link cards based on available data
const websitesContainer = document.getElementById("websites-container");
if (linksData.length > 0) {
  const linkCardsHtml = linksData
    .map((linkData) => generateLinkCard(linkData))
    .join("");
  websitesContainer.innerHTML = linkCardsHtml;
}

// define an array of services
const services = data?.service?.services;

let serviceStatus = data?.service?.status;

if (!serviceStatus || services.length == 0) {
  document.getElementsByClassName("services-section")[0].style.display = "none";
}

// get the services-icons container
const servicesIcons = document.getElementById("services-icons");

// loop through the services array and dynamically create the service elements
services.forEach((service) => {
  const serviceElem = document.createElement("div");
  serviceElem.classList.add("service");
  const titleElem = document.createElement("p");
  titleElem.classList.add("s-title");
  titleElem.textContent = service.label;
  serviceElem.appendChild(titleElem);
  servicesIcons.appendChild(serviceElem);
});

// get the video container and iframe element
const videoContainer = document.querySelector(".embedding .video");
const videoFrame = videoContainer.querySelector("iframe");

let ytStatus = data?.video?.status;

// set the YouTube video URL
const youtubeUrl = ytStatus ? data?.video?.link?.link : "";
videoFrame.style.display = ytStatus ? "block" : "none";

// set the src attribute of the iframe element
videoFrame.setAttribute("src", youtubeUrl);

// ---------

// Define an array of products
const products = data?.product?.products;

let productVisibility = data?.product?.status;

if (!productVisibility || products.length == 0) {
  document.getElementsByClassName("products-section")[0].style.display = "none";
}

// Get the products section container
const productsSection = document.getElementById("products-section");

// Create the products heading element
const productsHead = document.createElement("h3");
productsHead.classList.add("products-head", "head");
productsHead.textContent = "Products";

// Create the products icons container element
const productsIcons = document.createElement("div");
productsIcons.classList.add("products-icons");

// Loop through the products array and dynamically create the card elements
products.forEach((product) => {
  const cardElem = document.createElement("div");
  cardElem.classList.add("card");

  const cardImageElem = document.createElement("div");
  cardImageElem.classList.add("card-image");
  cardImageElem.style.backgroundImage = `url(${product?.image?.public})`;
  cardElem.appendChild(cardImageElem);

  const cardContentElem = document.createElement("div");
  cardContentElem.classList.add("card-content");
  cardElem.appendChild(cardContentElem);

  const cardTitleElem = document.createElement("h1");
  cardTitleElem.classList.add("card-title");
  cardTitleElem.textContent = product?.name;
  cardContentElem.appendChild(cardTitleElem);

  const cardSubtitleElem = document.createElement("p");
  cardSubtitleElem.classList.add("card-subtitle");
  cardSubtitleElem.textContent = product?.offerPrice;
  cardContentElem.appendChild(cardSubtitleElem);

  const cardButtonElem = document.createElement("button");
  cardButtonElem.classList.add("card-button");
  cardButtonElem.textContent = product.price;
  cardContentElem.appendChild(cardButtonElem);

  productsIcons.appendChild(cardElem);
});

// Add the elements to the products section container
productsSection.appendChild(productsHead);
productsSection.appendChild(document.createElement("hr"));
productsSection.appendChild(productsIcons);

// -------

// Define the bank details data as an object
const bankDetails = data?.bank?.bankDetails;

let bankVisibility = data?.bank?.status;

if (!bankVisibility || Object.values(bankDetails).every((val) => val === "")) {
  document.getElementsByClassName("bank-section")[0].style.display = "none";
}

// Get the bank details container element
const bankDetailsContainer = document.getElementById("bank-details");

// Create a function to dynamically render the bank details
function renderBankDetails() {
  // Check if all bank details are empty
  const isEmpty = Object.values(bankDetails).every((val) => val === "");
  if (isEmpty || !bankVisibility) {
    // If all bank details are empty, don't render anything
    bankDetailsContainer.innerHTML = "";
    return;
  }

  // Otherwise, create the bank details HTML dynamically
  let bankDetailsHTML = "";
  bankDetailsHTML += `<div class="bank-row"><div class="bank-col"><p class="dtl-head">Name</p><p class="dtl">${bankDetails.name}</p></div><div class="bank-col"></div></div>`;
  bankDetailsHTML += `<div class="bank-row"><div class="bank-col"><p class="dtl-head">Account Number</p><p class="dtl">${bankDetails.accnumber}</p></div><div class="bank-col"><p class="dtl-head">Bank Name</p><p class="dtl">${bankDetails.bank}</p></div></div>`;
  bankDetailsHTML += `<div class="bank-row"><div class="bank-col"><p class="dtl-head">Branch</p><p class="dtl">${bankDetails.branch}</p></div><div class="bank-col"><p class="dtl-head">IFSC Code</p><p class="dtl">${bankDetails.ifsc}</p></div></div>`;
  bankDetailsHTML += `<div class="bank-row"><div class="bank-col"><p class="dtl-head">Swift Code</p><p class="dtl">${bankDetails.swift}</p></div><div class="bank-col"><p class="dtl-head">VAT Number</p><p class="dtl">${bankDetails.vat}</p></div></div>`;

  // Set the bank details container HTML to the dynamically generated HTML
  bankDetailsContainer.innerHTML = bankDetailsHTML;
}

// Call the renderBankDetails function to render the bank details
renderBankDetails();

if (email) {
  const emailInputs = document.querySelectorAll(
    '.enq-icons input[type="text"]'
  );
  const submitBtn = document.querySelector(".enq-icons .submit_btn");
  submitBtn.addEventListener("click", () => {
    const name = emailInputs[0].value;
    const email = emailInputs[1].value;
    const phone = emailInputs[2].value;
    const subject = emailInputs[3].value;
    const mailtoLink = `mailto:${email}?subject=${subject}&body=Name: ${name}%0APhone: ${phone}`;
    window.location.href = mailtoLink;
  });
} else {
  const enqSection = document.querySelector(".enq-section");
  enqSection.style.display = "none";
}

// --------

const awardsData = data?.award?.awards;

let awardVisibility = data?.award?.status;

// main code

if (!awardVisibility || awardsData.length === 0) {
  let e = document.getElementsByClassName("awards_section");
  document.getElementsByClassName("awards_section")[0].style.display = "none";
}

const awardCardsDiv = document.getElementById("award-cards");

awardsData.forEach((award) => {
  const card = createAwardCard(award);
  awardCardsDiv.appendChild(card);
});

function createAwardCard(award) {
  const card = document.createElement("div");
  card.classList.add("award_card");

  const name = document.createElement("h3");
  name.textContent = award.label;
  card.appendChild(name);

  const authority = document.createElement("p");
  authority.textContent = award.value;
  card.appendChild(authority);

  return card;
}

// --------

// define an array of services
const certif = data?.certificate?.certificates;

let certifVisibility = data?.certificate?.status;

// main code

if (!certifVisibility || certif.length === 0) {
  const certifSection = document.getElementById("certif-section");
  if (certifSection) {
    certifSection.style.display = "none";
  }
}

// get the services-icons container
const certifIcons = document.getElementById("certif-icons");

// loop through the services array and dynamically create the service elements
certif.forEach((service) => {
  const serviceElem = document.createElement("div");
  serviceElem.classList.add("service");
  const titleElem = document.createElement("p");
  titleElem.classList.add("s-title");
  titleElem.textContent = service.label;
  serviceElem.appendChild(titleElem);
  certifIcons.appendChild(serviceElem);
  serviceElem.addEventListener("click", () =>
    toggleModel("Certificate", [service.label, service.value])
  );
});

const saveContactBtn = document.getElementById("save-contact");
saveContactBtn.addEventListener("click", () => {
  createVcard();
});

// --------
