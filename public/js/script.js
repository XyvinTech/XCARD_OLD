const data = JSON.parse(document.currentScript.getAttribute("data"));

const servicesData = data?.service;

const serviceVisibility = servicesData?.status;
const services = servicesData?.services;

const productsData = data?.product;

const productVisibility = productsData?.status;
const products = productsData?.products;

const videosData = data?.video;

const videoVisibility = videosData?.status;
const videos = videosData?.videos;

const altBtn = document.getElementById("btn_hi");
altBtn.style.display = "none";

const darkBtn = document.getElementById("butnDrk");
const lightBtn = document.getElementById("butnLgt");


function showFullScreenSpinner() {
  // Create the spinner element
  const spinner = document.createElement('div');
  spinner.className = 'fullscreen-spinner';

  // Append the spinner to the body
  document.body.appendChild(spinner);

  // Optional: You can add additional styling to the spinner element
  spinner.style.background = 'rgba(0, 0, 0, 0.5)';
  spinner.style.display = 'flex';
  spinner.style.justifyContent = 'center';
  spinner.style.alignItems = 'center';

  // Optional: You can also add a message or icon inside the spinner
  spinner.innerHTML = '<div class="spinner-icon"></div><p>Loading...</p>';

  // Add a class to the body to disable scrolling while the spinner is active
  document.body.classList.add('no-scroll');
}

showFullScreenSpinner();


function hideFullScreenSpinner() {
  // Remove the spinner element from the DOM
  const spinner = document.querySelector('.fullscreen-spinner');
  if (spinner) {
    spinner.remove();
  }

  // Remove the no-scroll class from the body
  document.body.classList.remove('no-scroll');
}


window.addEventListener("load", () => {
  lightMode();
  hideFullScreenSpinner();


  const videoContainer = document.querySelector(
    ".embedding .video .video-container"
  );
  const youtubeUrls = videos?.map((video) => video?.link);

  function extractVideoId(link) {
    const patterns = [
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|watch\?.+&amp;v=))([\w-]{11})/,
      /^([\w-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  function getEmbeddedLink(youtubeLink) {
    const videoId = extractVideoId(youtubeLink);

    const embeddedLink = `https://www.youtube.com/embed/${videoId}`;

    return embeddedLink;
  }

  if (!videoVisibility || youtubeUrls.length == 0) {
    document.getElementsByClassName("embedding")[0].style.display = "none";
  } else {
    youtubeUrls?.forEach((ytLink) => {
      const ytEmbed = getEmbeddedLink(ytLink);
      const videoFrame = document.createElement("iframe");
      videoFrame.src = ytEmbed;
      videoFrame.frameborder = "0";
      videoFrame.allowfullscreen = true;

      videoContainer.appendChild(videoFrame);
    });
  }
});

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

function toggleModel(name, link, copy = false) {
  model.innerHTML = "";
  const h1 = document.createElement("h1");
  h1.classList.add("model_heading");
  h1.innerHTML = name;

  model.appendChild(h1);
  link?.forEach((item) => {
    var datacard = inputCard(item, (copy = false));
    model.appendChild(datacard);
  });
  model_container.classList.add("show");
}

function hideModel() {
  model_container.classList.remove("show");
}

function inputCard(data, copy = false) {
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

  div.appendChild(input);
  if (copy) {
    const i = document.createElement("i");
    i.addEventListener("click", () => {
      copyToClipboard(data);
    });
    i.classList.add("fa", "fa-copy");
    div.appendChild(i);
  }
  return div;
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    return;
  }
  const textArea = document.createElement("textarea");
  textArea.value = text;

  document.body.appendChild(textArea);

  textArea.focus();
  textArea.select();

  document.execCommand("copy");

  document.body.removeChild(textArea);
}

const personData = {
  profilePic: data?.profile?.profilePicture?.public,
  name: data?.profile?.name,
  email: data?.contact?.contacts[1]?.value,
  company: data?.profile?.companyName,
  position: data?.profile?.designation,
  phone: data?.contact?.contacts[0]?.value,
  websites: [
    { link: `${window.location.href}` },
    ...(data?.website?.websites || []),
  ],
  address: `${data?.contact?.contacts[3]?.value}, ${data?.contact?.contacts[3]?.street}`,
  whatsapp: data?.contact?.contacts?.find((item) => item.type === "whatsapp")
    .value,
};

const createVcard = () => {
  const websites = personData.websites;
  const nameParts = personData.name.split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");
  const vcardData = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${lastName};${firstName};;`,
    `FN:${personData.name}`,
    `EMAIL;TYPE=WORK:${personData.email}`,
    `ORG:${personData.company}`,
    `TITLE:${personData.position}`,
    `ADR;TYPE=WORK:;;${personData.address}`,
    `TEL;TYPE=CELL:${personData.phone}`,
    ...websites?.map((website) => `URL:${website.link}`),
    `X-SOCIALPROFILE;TYPE=whatsapp:${personData.whatsapp}`,
    ...socialMedia?.socials.map((social) => `URL:${social.value}`),
    "END:VCARD",
  ].join("\n");

  const blob = new Blob([vcardData], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);

  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = `${personData.name}.vcf`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  // Release the object URL after the download has started
  URL.revokeObjectURL(url);
};

const saveContactBtn = document.getElementById("save-contact");
saveContactBtn.addEventListener("click", () => {
  createVcard();
});

const nameElement = document.getElementById("name");
const positionElement = document.getElementById("position");
const companyElement = document.getElementById("company");
const bioElement = document.getElementById("bio");
const profilePicture = document.getElementById("profile-picture");
const backgroundPicture = document.getElementById("background-picture");

if (data?.profile?.name) {
  nameElement.innerHTML = data.profile.name;
} else {
  nameElement.style.display = "none";
}

if (data?.profile?.designation) {
  positionElement.innerHTML = data.profile.designation;
} else {
  positionElement.style.display = "none";
}

if (data?.profile?.companyName) {
  companyElement.innerHTML = data.profile.companyName;
} else {
  companyElement.style.display = "none";
}

if (data?.profile?.bio) {
  bioElement.innerHTML = data.profile.bio;
} else {
  bioElement.style.display = "none";
}
if (data?.profile?.profilePicture?.public) {
  profilePicture.src = data.profile.profilePicture.public;
} else {
  bioElement.style.display = "none";
}
if (data?.profile?.profileBanner?.public) {
  backgroundPicture.src = data.profile.profileBanner.public;
} else {
  bioElement.style.display = "none";
}

const socialMedia = data?.social;
const socialMediaVisibility = data?.social?.status;

let socialMediaHTML = "";

if (socialMedia && Array.isArray(socialMedia.socials)) {
  for (const social of socialMedia.socials) {
    if (social.value !== "") {
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
        case "facebook":
          iconClass = "fa-brands fa-facebook";
          break;
        case "spotify":
          iconClass = "fa-brands fa-spotify";
          break;
        case "medium":
          iconClass = "fa-brands fa-medium";
          break;
        case "youtube":
          iconClass = "fa-brands fa-youtube";
          break;
        case "github":
          iconClass = "fa-brands fa-github";
          break;
        case "behance":
          iconClass = "fa-brands fa-behance";
          break;
        case "dribble":
          iconClass = "fa-brands fa fa-dribbble";
          break;
        default:
          iconClass = "fa-solid fa-link";
      }
      socialMediaHTML += `
        <a href="${social.value}" class="image sm-icons">
          <i class="${iconClass}"></i>
        </a>
      `;
    }
  }
}

const socialMediaSection = document.getElementById("social-media-section");
socialMediaSection.innerHTML = socialMediaVisibility
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

const contactsData = data?.contact?.contacts;

let contactVisible = data?.contact?.status;

if (!contactVisible || contactsData.length === 0) {
  document.getElementsByClassName("contacts-section")[0].style.display = "none";
}

const contactsIconsDiv = document.getElementById("contacts-icons");

contactsData?.forEach((data) => {
  if (data.value !== "") {
    const button = createButton(data.type, data.value, data);
    contactsIconsDiv.appendChild(button);
  }
});
function createButton(type, value, all) {
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
    button.onclick = () => window.open(`${all?.pincode}`);
  } else if (type === "whatsapp") {
    icon.classList.add("fa-brands", "fa-whatsapp");
    button.onclick = () => window.open(`https://wa.me/${value}?text='Hi'`);
  } else if (type === "wabusiness") {
    const img = `<svg width="25" height="25" viewBox="0 0 25 25" fill="var(--btnTxt)" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M21.0564 3.69444C18.7945 1.43052 15.7866 0.183221 12.5814 0.181885C5.97766 0.181885 0.603173 5.55436 0.6005 12.1582C0.597893 14.2599 1.1495 16.325 2.19968 18.1455L0.5 24.3519L6.85128 22.6864C8.60802 23.6429 10.5764 24.144 12.5766 24.1442H12.5815C19.1845 24.1442 24.5596 18.7711 24.5623 12.1673C24.5635 8.96709 23.3185 5.95783 21.0564 3.69431V3.69444ZM12.5815 22.1219H12.5774C10.7941 22.1222 9.04354 21.6429 7.50908 20.7343L7.14543 20.5186L3.37668 21.5075L4.38262 17.8341L4.1462 17.4568C3.14843 15.8701 2.62022 14.0333 2.62266 12.1589C2.62534 6.67029 7.09251 2.20498 12.5854 2.20498C15.2449 2.20605 17.7454 3.24286 19.6255 5.12456C21.5056 7.00627 22.5404 9.50728 22.5389 12.1676C22.5368 17.6567 18.0697 22.1226 12.5811 22.1226L12.5815 22.1219Z" fill="var(--btnTxt)"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M8.56446 17.9598C8.64878 18.0106 8.82199 18.0106 9.21931 18.0102C10.9052 18.0087 12.3614 18.0036 13.3973 18.0036C18.2313 18.0036 18.1042 12.9146 15.844 12.2797C16.1751 11.6932 17.6834 10.5915 16.7505 8.3142C15.8284 6.06243 11.8612 6.57349 9.14808 6.57482C8.14415 6.57482 8.29436 7.31668 8.29944 8.47003C8.30773 10.2968 8.30091 15.2414 8.29944 17.3788C8.29944 17.8121 8.43028 17.8787 8.56446 17.9598ZM10.6561 16.0948C11.1125 16.0948 12.1891 16.0948 13.1121 16.0933C14.1572 16.0917 15.0877 15.6029 15.0645 14.5624C15.0475 13.5824 14.3955 13.2608 13.4904 13.1709C12.6284 13.1792 11.6425 13.1792 10.6561 13.1792V16.0948ZM10.6561 11.2109C12.4743 11.1859 13.1758 11.2842 14.1685 11.0356C14.8501 10.648 15.1487 9.21242 14.1724 8.72462C13.4942 8.38583 11.4901 8.5017 10.6561 8.53645V11.2109Z" fill="var(--btnTxt)"/>
    </svg>
    `;
    const imgWrapper = document.createElement("div");
    imgWrapper.innerHTML = img;
    button.appendChild(imgWrapper.firstChild);

    button.onclick = () => window.open(`https://wa.me/${value}?text='Hi'`);

    altBtn.onclick = () => window.open(`https://wa.me/${value}?text='Hi'`);
    altBtn.style.display = "block";
  }

  button.appendChild(icon);

  return button;
}
const linksData = data?.website?.websites;

let linkStatus = data?.website?.status;

if (!linkStatus || linksData?.length == 0) {
  document.getElementsByClassName("websites-section")[0].style.display = "none";
}

function addHttpsToLinks(link) {
  if (!link?.startsWith("http://") && !link?.startsWith("https://")) {
    link = "https://" + link;
  }
  return link;
}

function generateLinkCard(linkData) {
  const link = addHttpsToLinks(linkData?.link);
  return `
    <div class="link-card">
      <p class="link">${linkData?.name}</p>
      <button class="image" onclick="window.open('${link}', '_blank')">
      
      <svg class='arrow' width="14" height="14" viewBox="0 0 14 14" fill="var(--btnTxt)" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.10691 13.2783L0.758644 11.93L10.0039 2.68471H1.72169V0.758606H13.2783V12.3152H11.3522V4.03298L2.10691 13.2783Z" fill="var(--btnTxt)"/>
      </svg>
      
      </button>
    </div>
  `;
}

const websitesContainer = document.getElementById("websites-container");
if (linksData?.length > 0) {
  const linkCardsHtml = linksData
    ?.filter((obj) => obj?.link !== null || obj?.link !== "")
    .map((linkData) => generateLinkCard(linkData))
    .join("");
  websitesContainer.innerHTML = linkCardsHtml;
}

if (!serviceVisibility || services.length == 0) {
  document.getElementById("services-section").style.display = "none";
} else {
  const servicesSection = document.getElementById("services-section");
  const servicesIcons = document.createElement("div");
  servicesIcons.classList.add("products-icons");

  services?.forEach((service) => {
    const cardElem = document.createElement("div");
    cardElem.classList.add("card");

    const cardImageElem = document.createElement("div");
    cardImageElem.classList.add("card-image");
    if (service?.image) {
      cardImageElem.style.backgroundImage = `url(${service?.image?.public})`;
    } else {
      cardImageElem.style.backgroundImage = `/profile/public/images/image.png`;
    }
    cardElem.appendChild(cardImageElem);

    const cardContentElem = document.createElement("div");
    cardContentElem.classList.add("card-content");
    cardElem.appendChild(cardContentElem);

    const cardTitleElem = document.createElement("h1");
    cardTitleElem.classList.add("card-title");
    cardTitleElem.textContent = service.label;
    cardContentElem.appendChild(cardTitleElem);

    const cardButtonElem = document.createElement("button");
    cardButtonElem.classList.add("card-button");
    cardButtonElem.textContent = "View More";
    cardContentElem.appendChild(cardButtonElem);
    cardButtonElem.addEventListener("click", (e) => {
      openPopup(
        service?.image?.public,
        service?.label,
        null,
        service?.description,
        service?.value
      );
    });

    servicesIcons.appendChild(cardElem);
  });

  servicesSection.appendChild(servicesIcons);
}

const docsSection = document.getElementById("docs-section");
const docsData = data?.document;
const docsVisibility = docsData?.status;
const documents = docsData?.documents;

if (!docsVisibility || documents.length == 0) {
  docsSection.style.display = "none";
} else {
  const docsSectionIcons = document.createElement("div");
  docsSectionIcons.classList.add("docs-icons");
  const docsHead = document.createElement("h3");
  docsHead.classList.add("products-head", "head");
  docsHead.textContent = "Files";

  documents?.forEach((doc) => {
    const docCard = document.createElement("div");
    docCard.classList.add("doc-card", "link-card");

    const docHead = document.createElement("p");
    docHead.classList.add("doc-title");
    docHead.textContent = doc?.image?.fileName;
    docCard.appendChild(docHead);

    const downloadButton = document.createElement("button");
    downloadButton.classList.add("download-button");
    const icon = document.createElement("i");
    const viewable = [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "mp4",
      "avi",
      "mkv",
      "mov",
      "webm",
      "mp3",
      "ogg",
      "wav",
      "flac",
      "aac",
      "wma",
      "m4a",
      "opus",
      "svg",
      "ico",
      "webp",
      "bmp",
      "3gp",
    ];

    if (viewable.includes(doc?.image?.fileName.split(".").pop())) {
      icon.classList.add("fa-solid", "fa-eye");
    } else {
      icon.classList.add("fa", "fa-download");
    }

    downloadButton.appendChild(icon);
    docCard.appendChild(downloadButton);

    downloadButton.addEventListener("click", () => {
      window.location.href = doc?.image?.public;
    });

    docsSectionIcons.appendChild(docCard);
  });

  docsSection.appendChild(docsHead);
  docsSection.appendChild(document.createElement("hr"));
  docsSection.appendChild(docsSectionIcons);
}

// ---------

if (!productVisibility || products.length == 0) {
  document.getElementsByClassName("products-section")[0].style.display = "none";
}

const productsSection = document.getElementById("products-section");

const productsHead = document.createElement("h3");
productsHead.classList.add("products-head", "head");
productsHead.textContent = "Products";

const productsIcons = document.createElement("div");
productsIcons.classList.add("products-icons");

products?.forEach((product) => {
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
  cardTitleElem.textContent = product.name;
  cardContentElem.appendChild(cardTitleElem);

  const cardButtonElem = document.createElement("button");
  cardButtonElem.classList.add("card-button");
  cardButtonElem.textContent = "View More";
  cardContentElem.appendChild(cardButtonElem);
  cardButtonElem.addEventListener("click", (e) => {
    if (product?.price) {
      openPopup(
        product?.image?.public,
        product?.name,
        null,
        product?.description,
        product?.link,
        {
          oldPrice: product?.price,
          newPrice: product?.offerPrice,
        }
      );
    } else {
      openPopup(
        product?.image?.public,
        product?.name,
        null,
        product?.description,
        product?.link,
        null
      );
    }
  });

  productsIcons.appendChild(cardElem);
});

productsSection.appendChild(productsHead);
productsSection.appendChild(document.createElement("hr"));
productsSection.appendChild(productsIcons);

const awards = data?.award?.awards;

let awardStatus = data?.award?.status;

if (!awardStatus || awards.length == 0) {
  document.getElementsByClassName("awards-section")[0].style.display = "none";
}

const awardSection = document.getElementById("award-section");

// Create the products heading element
const awardHead = document.createElement("h3");
awardHead.classList.add("products-head", "head");
awardHead.textContent = "Awards";

const awardIcons = document.createElement("div");
awardIcons.classList.add("products-icons");

awards?.forEach((award) => {
  const card = document.createElement("div");
  card.classList.add("card");

  const cardImageElem = document.createElement("div");
  cardImageElem.classList.add("card-image");
  if (award?.image) {
    cardImageElem.style.backgroundImage = `url(${award?.image?.public})`;
  } else {
    cardImageElem.style.backgroundImage = `/profile/public/images/image.png`;
  }
  card.appendChild(cardImageElem);

  const cardContentElem = document.createElement("div");
  cardContentElem.classList.add("card-content");
  card.appendChild(cardContentElem);

  const cardTitleElem = document.createElement("h1");
  cardTitleElem.classList.add("card-title");
  cardTitleElem.textContent = award?.label;
  cardContentElem.appendChild(cardTitleElem);

  const cardButtonElem = document.createElement("button");
  cardButtonElem.classList.add("card-button");
  cardButtonElem.textContent = "View More";
  cardContentElem.appendChild(cardButtonElem);
  cardButtonElem.addEventListener("click", (e) => {
    openPopup(
      (image = award?.image?.public),
      (title = award?.label),
      (id = award?.value),
      null,
      null,
      null
    );
  });

  awardIcons.appendChild(card);
});

awardSection.appendChild(awardHead);
awardSection.appendChild(document.createElement("hr"));
awardSection.appendChild(awardIcons);

const certif = data?.certificate?.certificates;

let certifVisibility = data?.certificate?.status;

if (!certifVisibility || certif.length == 0) {
  document.getElementsByClassName("certif-section")[0].style.display = "none";
}
const certifIcons = document.getElementById("certif-icons");
certifIcons.classList.add("products-icons");

certif?.forEach((service) => {
  const card = document.createElement("div");
  card.classList.add("card");

  const cardImageElem = document.createElement("div");
  cardImageElem.classList.add("card-image");
  if (service?.image) {
    cardImageElem.style.backgroundImage = `url(${service?.image?.public})`;
  } else {
    cardImageElem.style.backgroundImage = `/profile/public/images/image.png`;
  }
  card.appendChild(cardImageElem);

  const cardContentElem = document.createElement("div");
  cardContentElem.classList.add("card-content");
  card.appendChild(cardContentElem);

  const cardTitleElem = document.createElement("h1");
  cardTitleElem.classList.add("card-title");
  cardTitleElem.textContent = service?.label;
  cardContentElem.appendChild(cardTitleElem);

  const cardButtonElem = document.createElement("button");
  cardButtonElem.classList.add("card-button");
  cardButtonElem.textContent = "View More";
  cardContentElem.appendChild(cardButtonElem);
  cardButtonElem.addEventListener("click", (e) => {
    openPopup(
      (image = service?.image?.public),
      (title = service?.label),
      (id = service?.value),
      null,
      null,
      null
    );
  });

  certifIcons.appendChild(card);
});

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function handleScroll() {
  var scrollButton = document.getElementById("scrollButton");
  var footer = document.getElementById("footer");
  var footerOffset = footer.offsetTop;
  var scrollButtonPosition = window.pageYOffset + window.innerHeight;

  if (scrollButtonPosition > footerOffset) {
    scrollButton.style.bottom = scrollButtonPosition - footerOffset + 16 + "px";
  } else {
    scrollButton.style.bottom = "16px";
  }

  if (window.pageYOffset > 200) {
    scrollButton.style.display = "block";
  } else {
    scrollButton.style.display = "none";
  }
}

window.addEventListener("scroll", handleScroll);

function openPopup(
  image = null,
  title = null,
  id = null,
  description = null,
  link = null,
  price = null
) {
  var popup = document.querySelector(".popup__container");
  var popupImage = document.getElementById("popupImage");
  popupImage.style.display = "none";
  var popupTitle = document.getElementById("popupTitle");
  popupTitle.style.display = "none";
  var prices = document.getElementById("price");
  prices.style.display = "none";
  var popupDescription = document.getElementById("popupDescription");
  popupDescription.style.display = "none";
  var popupButton = document.getElementById("popupButton");
  popupButton.style.display = "none";
  var popupAuthID = document.getElementById("popupAuthID");
  popupAuthID.style.display = "none";
  var newPrice = document.getElementById("newPrice");
  newPrice.style.display = "none";
  var oldPrice = document.getElementById("oldPrice");
  oldPrice.style.display = "none";

  popup.classList.add("show_popup");

  if (isEmpty(image)) {
    popupImage.src = image;
  } else {
    popupImage.src = `/profile/public/images/image.png`;
  }
  popupImage.style.display = "inline-block";

  if (isEmpty(title)) {
    popupTitle.innerHTML = title;
    popupTitle.style.display = "inline-block";
  }

  if (isEmpty(price)) {
    prices.style.display = "inline-block";

    if (!price.newPrice) {
      newPrice.innerHTML = "INR " + price.oldPrice;
      newPrice.style.display = "inline-block";
      oldPrice.style.display = "none";
    } else {
      newPrice.innerHTML = "INR " + price.newPrice;
      newPrice.style.display = "inline-block";

      oldPrice.innerHTML = "INR " + price.oldPrice;
      oldPrice.style.display = "inline-block";
    }
  } else {
    var prices = document.getElementById("price");
    prices.style.display = "none";
  }

  if (isEmpty(description)) {
    popupDescription.innerHTML = description;
    popupDescription.style.display = "inline-block";
  }

  if (isEmpty(link)) {
    popupButton.onclick = function () {
      window.location.href = link;
    };
    popupButton.style.display = "inline-block";
  } else {
    popupButton.style.display = "none";
  }

  if (isEmpty(id)) {
    popupAuthID.innerHTML = id;
    popupAuthID.style.display = "inline-block";
  }
}

function closePopup() {
  var popup = document.querySelector(".popup__container");
  popup.classList.remove("show_popup");
}

const isEmpty = (obj) => {
  if (obj === null || obj === undefined) {
    return false;
  }

  if (typeof obj === "object" && Object.keys(obj).length === 0) {
    return false;
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (value !== null && value !== undefined) {
        if (typeof value === "object") {
          if (hasMeaningfulValue(value)) {
            return true;
          }
        } else if (value !== "" && value !== false) {
          return true;
        }
      }
    }
  }

  return false;
};

const submitBtn = document.getElementById("form_submit");
submitBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const postURL = "https://app.visitingcard.store/profile/submitForm";
  const id = data["_id"];
  const nameInput = document.getElementById("frm_name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const messageInput = document.getElementById("message");
  const name = nameInput.value;
  const email = emailInput.value;
  const phone = phoneInput.value;
  const message = messageInput.value;

  fetch(postURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      name,
      email,
      phone,
      message,
    }),
  })
    .then((response) => {
      if (response.ok) {
        console.log("POST request sent successfully!");
        toggleModel("Thank you for your response", []);
        nameInput.value = "";
        emailInput.value = "";
        phoneInput.value = "";
        messageInput.value = "";
      } else {
        console.error("Failed to send POST request.");
      }
    })
    .catch((error) => {
      console.error("Error sending POST request:", error);
    });
});
