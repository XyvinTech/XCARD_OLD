const viewable = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'mp4',
  'avi',
  'mkv',
  'mov',
  'webm',
  'mp3',
  'ogg',
  'wav',
  'flac',
  'aac',
  'wma',
  'm4a',
  'opus',
  'svg',
  'ico',
  'webp',
  'bmp',
  '3gp',
];

const data = JSON.parse(document.currentScript.getAttribute('data'));
const fetchUserData = async () => {
  // change to backend api
  return data;
};

const handleImage = (imageUrl, no_image) => {
  if (imageUrl === null) {
    imageUrl = no_image;
  } else if (imageUrl.public === null || imageUrl.public === '') {
    imageUrl = no_image;
  } else {
    imageUrl = imageUrl.public;
  }
  return imageUrl;
};

function viewDocument(fileName) {
  const certificate_image_section = document.getElementById(
    'certificate_image_section'
  );
  const certificate_popup_img = document.getElementById(
    'certificate_popup_img'
  );
  const popup_close_btn = document.getElementById('popup_close_btn');
  certificate_popup_img.src = fileName;
  certificate_image_section.classList.remove('d_none');
  popup_close_btn.onclick = () => {
    certificate_image_section.classList.add('d_none');
  };
}

function downloadDocument(publicUrl, fileName, mimeType) {
  window.location.href = publicUrl;
  // Check if the required parameters are provided
  // if (!publicUrl || !fileName || !mimeType) {
  //     console.error("Missing required parameters");
  //     return;
  // }

  // Create a Blob with the provided mimeType
  // fetch(publicUrl)
  //     .then(response => response.blob())
  //     .then(blob => {
  //         const url = URL.createObjectURL(blob);

  //         const downloadLink = document.createElement("a");
  //         downloadLink.href = url;
  //         downloadLink.download = fileName; // Use the provided fileName
  //         document.body.appendChild(downloadLink);
  //         downloadLink.click();
  //         document.body.removeChild(downloadLink);

  //         // Release the object URL after the download has started
  //         URL.revokeObjectURL(url);
  //     })
  //     .catch(error => {
  //         console.error("Error fetching the document:", error);
  //     });
}

function copyToClipboard(button, text, type) {
  try {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        const img = document.getElementById(`${text.toLowerCase()}_copy_icon`);
        setTimeout(() => {
          if (img) {
            img.src = '/profile/public/blue-black/assets/icons/tick.svg';
          }
        }, 500);

        // After 2.5 seconds, change the button image back to "copy.svg"
        setTimeout(() => {
          if (img) {
            img.src = '/profile/public/blue-black/assets/icons/copy.svg';
          }
        }, 2500);
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
      });
  } catch (err) {
    console.error('Clipboard API not supported:', err);
  }
}

const contactCardImg = (type) => {
  switch (type.toLowerCase()) {
    case 'instagram':
      return 'ig.svg';
    case 'linkedin':
      return 'linkedin.svg';
    case 'twitter':
      return 'x.svg';
    case 'x':
      return 'x.svg';
    case 'google':
      return 'google.svg';
    case 'facebook':
      return 'fb.svg';
    case 'phone':
      return 'call.svg';
    case 'dribble':
      return 'dribble.svg';
    case 'whatsapp':
      return 'whatsapp_blk.svg';
    case 'email':
      return 'email.svg';
    case 'gmail':
      return 'email.svg';
    case 'gmail':
      return 'email.svg';
    case 'wabusiness':
      return 'wp_b.svg';
    case 'location':
      return 'location.svg';
    case 'youtube':
      return 'youtube.svg';
    case 'other':
      return 'link.svg';
    default:
      return 'link.svg';
  }
};

function isPhoneNumber(value) {
  return /^-?\d+(\.\d+)?$/.test(value) && value.length <= 15;
}
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function createVCard(
  websites,
  name,
  company,
  designation,
  email,
  phoneNumber,
  locationInfo,
  socials,
  whatsapp
) {
  const name_split = name.split(' ');
  const firstName = name_split[0];
  const lastName = name_split.slice(1).join(' ');

  const newWebsites = Array.isArray(websites)
    ? websites.map((website) => `URL:${website.link}`)
    : [];

  const newSocials = Array.isArray(socials)
    ? socials?.map((social) => `URL:${social.value}`)
    : [];

  const vcardData = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;`,
    `FN:${name ?? ''}`,
    `EMAIL;TYPE=WORK:${email ?? ''}`,
    `ORG:${company ?? ''}`,
    `TITLE:${designation ?? ''}`,
    `ADR;TYPE=WORK:;;${
      locationInfo.value.replace(/\n/g, ';') ?? locationInfo.street ?? ''
    };${locationInfo.pincode ?? ''}`,
    `TEL;TYPE=CELL:${phoneNumber ?? ''}`,
    `URL:${window.location.href ?? ''}`,
    ...newWebsites,
    `X-SOCIALPROFILE;TYPE=whatsapp:${whatsapp}`,
    ...newSocials,
    'END:VCARD',
  ].join('\n');

  const blob = new Blob([vcardData], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);

  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `${name}.vcf`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  // Release the object URL after the download has started
  URL.revokeObjectURL(url);
}

const sendHiToWhatsApp = (whatsapp, btn) => {
  const whatsappLink = `https://wa.me/${whatsapp}?text=Hi`;
  btn.href = whatsappLink;
};

const showProductPopup = (
  productName,
  fakePrice,
  originalPrice,
  imageUrl,
  description,
  link
) => {
  const product_popup_section = document.getElementById(
    'product_popup_section'
  );
  const product_popup_close_btn = document.getElementById(
    'product_popup_close_btn'
  );
  const product_popup_img = document.getElementById('product_popup_img');
  const product_popup_heading = document.getElementById(
    'product_popup_heading'
  );
  const product_fake_price = document.getElementById('product_fake_price');
  const product_popup_orginal_price = document.getElementById(
    'product_popup_orginal_price'
  );
  const product_popup_desc = document.getElementById('product_popup_desc');
  const product_popup_btn = document.getElementById('product_popup_btn');

  product_popup_img.src = imageUrl;
  product_popup_heading.innerText = productName;
  product_fake_price.innerText = fakePrice === null ? '' : `${fakePrice}`;
  product_popup_orginal_price.innerText =
    originalPrice === null ? '' : `${originalPrice}`;
  product_popup_desc.innerText = description;
  product_popup_btn.href = link;

  product_popup_section.classList.remove('d_none');
  product_popup_close_btn.onclick = () => {
    product_popup_section.classList.add('d_none');
  };
};

const showServicePopup = (name, description, imageUrl, link) => {
  const service_popup_section = document.getElementById(
    'service_popup_section'
  );
  const service_popup_close_btn = document.getElementById(
    'service_popup_close_btn'
  );
  const service_popup_img = document.getElementById('service_popup_img');
  const service_popup_heading = document.getElementById(
    'service_popup_heading'
  );
  const service_popup_desc = document.getElementById('service_popup_desc');
  const service_popup_btn = document.getElementById('service_popup_btn');

  service_popup_img.src = imageUrl;
  service_popup_heading.innerText = name;
  service_popup_desc.innerText = description;
  service_popup_btn.href = link;

  service_popup_section.classList.remove('d_none');
  service_popup_close_btn.onclick = () => {
    service_popup_section.classList.add('d_none');
  };
};

const showAwardPopup = (heading, description, imageUrl) => {
  const award_popup_section = document.getElementById('award_popup_section');
  const award_popup_close_btn = document.getElementById(
    'award_popup_close_btn'
  );
  const award_popup_img = document.getElementById('award_popup_img');
  const award_popup_heading = document.getElementById('award_popup_heading');
  const award_popup_desc = document.getElementById('award_popup_desc');

  award_popup_img.src = imageUrl;
  award_popup_heading.innerText = heading;
  award_popup_desc.innerText = description;

  award_popup_section.classList.remove('d_none');
  award_popup_close_btn.onclick = () => {
    award_popup_section.classList.add('d_none');
  };
};

function generateContactCard(link, label) {
  var cardImage;
  label = label.toLowerCase();
  if (label == 'email') {
    cardImage = '<i class="fa-solid fa-at"></i>';
  } else if (label == 'instagram') {
    cardImage = '<i class="fa-brands fa-instagram"></i>';
  } else if (label == 'whatsapp') {
    cardImage = '<i class="fa-brands fa-whatsapp"></i>';
  } else if (label == 'linkedin') {
    cardImage = '<i class="fa-brands fa-linkedin"></i>';
  } else if (label == 'facebook') {
    cardImage = '<i class="fa-brands fa-facebook"></i>';
  } else if (label == 'x' || label == 'twitter') {
    cardImage = '<i class="fa-brands fa-x-twitter"></i>';
  } else if (label == 'dribble') {
    cardImage = '<i class="fa-brands fa-dribbble"></i>';
  } else if (label == 'phone') {
    cardImage = '<i class="fa-solid fa-phone"></i>';
  } else if (label == 'whatsapp-business') {
    cardImage = '<img src="/profile/public/blue-black/assets/icons/wp_b.svg">';
  } else if (label == 'youtube') {
    cardImage = '<i class="fa-brands fa-youtube"></i>';
  } else if (label == 'snapchat') {
    cardImage = '<i class="fa-brands fa-snapchat"></i>';
  } else if (label == 'pinterest') {
    cardImage = '<i class="fa-brands fa-pinterest"></i>';
  } else if (label == 'github') {
    cardImage = '<i class="fa-brands fa-github"></i>';
  } else if (label == 'discord') {
    cardImage = '<i class="fa-brands fa-discord"></i>';
  } else if (label == 'tiktok') {
    cardImage = '<i class="fa-brands fa-tiktok"></i>';
  } else if (label == 'telegram') {
    cardImage = '<i class="fa-brands fa-telegram"></i>';
  } else if (label == 'spotify') {
    cardImage = '<i class="fa-brands fa-spotify"></i>';
  } else if (label == 'threads') {
    cardImage = '<i class="fa-brands fa-threads"></i>';
  } else {
    cardImage = '<i class="fa-solid fa-globe"></i>';
  }

  return `
        <div class="contact_card">
            <a href=${link}>
            ${cardImage}
            </a>
        </div>
    `;
}

function generateContactMeLabel(status) {
  if (
    status === null ||
    status === undefined ||
    status === '' ||
    status === false
  ) {
    return '';
  }
  return `
            <h4 id="contact_me_label" class="gradient_text sub_heading">${
              data.contact.label ?? `Contact Me`
            }</h4>
        `;
}

function generateLongContactCard(label, type, link, value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  var cardImage;
  temp = label;
  label = type;
  if (label == 'email') {
    cardImage = '<i class="fa-solid fa-at"></i>';
  } else if (label == 'instagram') {
    cardImage = '<i class="fa-brands fa-instagram"></i>';
  } else if (label == 'whatsapp' || label == 'wabusiness') {
    cardImage = '<i class="fa-brands fa-whatsapp"></i>';
  } else if (label == 'linkedin') {
    cardImage = '<i class="fa-brands fa-linkedin"></i>';
  } else if (label == 'facebook') {
    cardImage = '<i class="fa-brands fa-facebook"></i>';
  } else if (label == 'x' || label == 'twitter') {
    cardImage = '<i class="fa-brands fa-x-twitter"></i>';
  } else if (label == 'dribble') {
    cardImage = '<i class="fa-brands fa-dribbble"></i>';
  } else if (label == 'phone') {
    cardImage = '<i class="fa-solid fa-phone"></i>';
    //   } else if (label == "wabusiness") {
    //     cardImage = '<img src="/profile/public/blue-black/assets/icons/wp_b.svg">';
  } else if (label == 'youtube') {
    cardImage = '<i class="fa-brands fa-youtube"></i>';
  } else if (label == 'snapchat') {
    cardImage = '<i class="fa-brands fa-snapchat"></i>';
  } else if (label == 'pinterest') {
    cardImage = '<i class="fa-brands fa-pinterest"></i>';
  } else if (label == 'github') {
    cardImage = '<i class="fa-brands fa-github"></i>';
  } else if (label == 'discord') {
    cardImage = '<i class="fa-brands fa-discord"></i>';
  } else if (label == 'tiktok') {
    cardImage = '<i class="fa-brands fa-tiktok"></i>';
  } else if (label == 'telegram') {
    cardImage = '<i class="fa-brands fa-telegram"></i>';
  } else if (label == 'spotify') {
    cardImage = '<i class="fa-brands fa-spotify"></i>';
  } else if (label == 'threads') {
    cardImage = '<i class="fa-brands fa-threads"></i>';
  } else if (label == 'location') {
    cardImage = '<i class="fa-solid fa-location-dot"></i>';
  } else {
    cardImage = '<i class="fa-solid fa-globe"></i>';
  }

  label = temp;

  return `
        <div class="contact_long_card">
            <a class="contact_link" href="${link}">
                ${cardImage}
                <div class="contact_info">
                    <h5 class="fw_500 f_12">${label}</h5>
                    <p class="f_14 fw_600">${value}</p>
                </div>
            </a>
        </div>
    `;
}

function generateUserSiteCard(websiteName, link) {
  return `
        <div class="user_site_card">
            <a href=${link}>
                <div class="left_section">
                    <i class="fa-solid fa-globe"></i>
                    <p>${websiteName}</p>
                </div>
                <img src="/profile/public/blue-black/assets/icons/arrow_outward.svg" alt="">
            </a>
        </div>
    `;
}

function generateProductCard(
  productName,
  fakePrice,
  originalPrice,
  imageUrl,
  description,
  link
) {
  return `
    <div onclick="showProductPopup('${productName}', ${fakePrice}, ${originalPrice}, '${imageUrl}','${description}','${link}')" class="product_card">
    <img class="product_img" src="${imageUrl}" alt="${productName}">
            <div class="product_details">
                <div class="product_name">${productName}</div>
                <div class="product_price">
                    <p class="fake_price f_16 fw_400">${
                      fakePrice === null ? '' : `${fakePrice}`
                    }</p>
                    <p class="orginal_price f_16 fw_600">${
                      originalPrice === null ? '' : `${originalPrice}`
                    }</p>
                </div>
            </div>
        </div>
    `;
}

function createServiceCard(serviceName, serviceDescription, imageUrl, link) {
  const service_desc = serviceDescription || ''; // Use empty string if serviceDescription is undefined
  const service_no_img =
    '/profile/public/blue-black/assets/images/service_no_img.png';
  const card = document.createElement('div');
  card.classList.add('slider_service_card');
  card.innerHTML = `
        <img class="service_img" src="${handleImage(
          imageUrl,
          service_no_img
        )}" alt="${serviceName}">
        <div class="service_details">
            <h4 class="fw_600 f_16 service_heading">${serviceName}</h4>
            <p class="fw_400 f_14 service_desc">${service_desc}</p>
        </div>
    `;

  card.addEventListener('click', function () {
    showServicePopup(
      serviceName,
      service_desc,
      handleImage(imageUrl, service_no_img),
      link
    );
  });

  return card;
}

function generateAwardCard(awardTitle, organizationName, imageUrl) {
  const award_no_img =
    '/profile/public/blue-black/assets/images/award_no_img.png';
  return `
        <div onclick="showAwardPopup('${awardTitle}', '${organizationName}', '${handleImage(
    imageUrl,
    award_no_img
  )}')" class="award_card">
            <img class="award_img" src="${handleImage(
              imageUrl,
              award_no_img
            )}" alt="product">
            <div class="product_details">
                <h5 class="fw_600 f_16 award_title">${awardTitle}</h5>
                <p class="fw_400 f_16 award_organisation">${organizationName}</p>
            </div>
        </div>
    `;
}

function generateDocumentCard(doc) {
  const documentName = doc.label === '' ? doc.image.fileName : doc.label;
  let icon = '';
  const data = doc.image;
  let isViewableData;

  if (viewable.includes(data.fileName.split('.')[1])) {
    icon = 'eye.svg';
    isViewableData = true;
  } else {
    icon = 'download_gray.svg';
    isViewableData = false;
  }

  return `
        <div class="document_card">
            <div class="left_section">
                <img src="/profile/public/blue-black/assets/icons/document.svg" alt="file">
                <p class="document_name fw_400 f_14">${documentName}</p>
            </div>
            <button class="btn" onclick="${
              isViewableData
                ? `viewDocument('${data.public}')`
                : `downloadDocument('${data.public}', '${data.fileName}', '${data.mimeType}')`
            }">
                <img src="/profile/public/blue-black/assets/icons/${icon}" alt="download">
            </button>
        </div>
    `;
}

function generateCertificateCard(certificateTitle, organizationName, imageUrl) {
  const certificate_no_img =
    '/profile/public/blue-black/assets/images/certificate.png';
  return `
        <div class="certificate_card">
            <img src="${handleImage(
              imageUrl,
              certificate_no_img
            )}" alt="certificate">
            <h5 class="gradient_text fw_600 f_16">${certificateTitle}</h5>
            <p class="fw_400 f_16">${organizationName}</p>
        </div>
    `;
}

function generateBankDetail(type, data) {
  if (data === null || data === '') {
    return '';
  }
  return `
        <div class="bank_detail">
            <div class="bank_detail_left_section">
                <h6 class="gradient_text f_14 fw_500 bank_data_type">${type}</h6>
                <p class="fw_600 f_14 bank_data">${data}</p>
            </div>
            <button class="btn" onclick="copyToClipboard(this, '${data}', '${type}')">
                <img class="copy_icon" id="${data.toLowerCase()}_copy_icon" src="/profile/public/blue-black/assets/icons/copy.svg" alt="copy">
            </button>
        </div>
    `;
}

function generateYouTubePlayer(link) {
  if (link === '' || link === null) {
    return '';
  }
  const videoId = link.split('/')[3];
  return `
      <div class="youtube_player">
        <iframe class="yt_iframe" src="https://www.youtube.com/embed/${videoId}?controls=1" frameborder="0" allowfullscreen></iframe>
      </div>
    `;
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const contact_cards = document.getElementById('contact_cards');
  const contact_long_cards = document.getElementById('contact_long_cards');
  const contact_me_label = document.getElementById('contact_me_label');
  const user_contact_sites = document.getElementById('user_contact_sites');
  const contact_section = document.getElementById('contact_section');
  const products_section = document.getElementById('products_section');
  const services_section = document.getElementById('services_section');
  const products_card_section = document.getElementById(
    'products_card_section'
  );
  const awards_cards = document.getElementById('awards_cards');
  const documents_cards = document.getElementById('documents_cards');
  const certificate_cards = document.getElementById('certificate_cards');
  const bank_detail_cards = document.getElementById('bank_detail_cards');
  const youtube_player_section = document.getElementById(
    'youtube_player_section'
  );

  // user details
  const user_bg = document.getElementById('user_bg');
  const avatar = document.getElementById('avatar');
  const user_name = document.getElementById('user_name');
  const user_designation = document.getElementById('user_designation');
  const bio = document.getElementById('bio');
  const user_company = document.getElementById('user_company');

  // enquery form
  const enquiry_btn = document.getElementById('enquiry_btn');
  console.log(enquiry_btn);

  // contact
  const save_contact = document.getElementById('save_contact');
  const lets_chat_btn = document.getElementById('chatButton');
  const bottom_fixed_btn_link = document.getElementById(
    'bottom_fixed_btn_link'
  );

  const data = await fetchUserData();

  if (data) {
    const loader = document.getElementById('loader');
    loader.style.display = 'none';
  }

  // profile details
  if (data.profile) {
    const profile = data.profile;

    var name = profile.name;
    var company = profile.companyName;
    var designation = profile.designation;

    user_bg.src = profile.profileBanner?.public;
    avatar.src = profile.profilePicture?.public;
    user_name.innerText = name;
    bio.innerText = profile.bio;

    user_designation.innerText = designation;
    user_company.innerText = company;
  }

  // websites
  if (data.website && data.website.status && data.website.websites.length > 0) {
    const h4 = user_contact_sites.querySelector('h4');
    h4.textContent = data.website.label ?? 'Websites';

    var websites = data.website.websites;

    websites.map((website) => {
      user_contact_sites.innerHTML += generateUserSiteCard(
        website.name,
        website.link
      );
    });
  } else {
    document.getElementById('user_contact_sites').classList.add('d_none');
  }

  // products
  if (data.product && data.product.status && data.product.products.length > 0) {
    const h4 = products_section.querySelector('h4');
    h4.textContent = data.product.label ?? 'Products';

    data.product.products.map((product) => {
      products_card_section.innerHTML += generateProductCard(
        product.name,
        product.price,
        product.offerPrice,
        product.image.public,
        product.description,
        product.link
      );
    });
  } else {
    document.getElementById('products_section').classList.add('d_none');
  }

  // services
  const serviceGlider = document.querySelector('.service_glider');
  if (data.service && data.service.status && data.service.services.length > 0) {
    const h4 = services_section.querySelector('h4');
    h4.textContent = data.service.label ?? 'Services';
    const services = data.service.services;

    services.forEach((service) => {
      const card = createServiceCard(
        service.label,
        service.description,
        service.image,
        service.value
      );
      serviceGlider.appendChild(card);
    });
  } else {
    document.getElementById('services_section').classList.add('d_none');
  }

  // awards
  if (data.award && data.award.status && data.award.awards.length > 0) {
    document.getElementById('awards_section').querySelector('h4').textContent =
      data.award.label ?? 'Awards';

    data.award.awards.map((award) => {
      awards_cards.innerHTML += generateAwardCard(
        award.label,
        award.value,
        award.image
      );
    });
  } else {
    document.getElementById('awards_section').classList.add('d_none');
  }

  // documents
  if (
    data.document &&
    data.document.status &&
    data.document.documents.length > 0
  ) {
    document
      .getElementById('documents_section')
      .querySelector('h4').textContent = data.document.label ?? 'Catalogues';
    data.document.documents.map((document) => {
      documents_cards.innerHTML += generateDocumentCard(document);
    });
  } else {
    document.getElementById('documents_section').classList.add('d_none');
  }

  // certificates
  if (
    data.certificate &&
    data.certificate.status &&
    data.certificate.certificates.length > 0
  ) {
    document
      .getElementById('certificate_section')
      .querySelector('h4').textContent =
      data.certificate.label ?? 'Certificates';

    data.certificate.certificates.map((certificate) => {
      certificate_cards.innerHTML += generateCertificateCard(
        certificate.label,
        certificate.value,
        certificate.image
      );
    });
  } else {
    document.getElementById('certificate_section').classList.add('d_none');
  }

  // bank details
  if (data.bank && data.bank.status && data.bank.bankDetails != null) {
    const bankDetails = data.bank.bankDetails;
    bank_detail_cards.innerHTML += generateBankDetail('Name', bankDetails.name);
    bank_detail_cards.innerHTML += generateBankDetail(
      'Account Number',
      bankDetails.accnumber
    );
    bank_detail_cards.innerHTML += generateBankDetail('Bank', bankDetails.bank);
    bank_detail_cards.innerHTML += generateBankDetail(
      'IFSE Code',
      bankDetails.ifsc
    );
    bank_detail_cards.innerHTML += generateBankDetail(
      'Branch',
      bankDetails.branch
    );
    bank_detail_cards.innerHTML += generateBankDetail('VAT', bankDetails.vat);
    bank_detail_cards.innerHTML += generateBankDetail(
      'Swift',
      bankDetails.swift
    );
  } else {
    document.getElementById('bank_details_section').classList.add('d_none');
  }

  // youtube player
  if (data.video && data.video.status && data.video.videos.length > 0) {
    data.video.videos.map((video) => {
      youtube_player_section.innerHTML += generateYouTubePlayer(video.link);
    });
  } else {
    document.getElementById('youtube_player_section').classList.add('d_none');
  }

  let email = null;
  let phoneNumber = null;
  let locationInfo = null;
  let whatsapp = null;

  if (data.contact && data.contact.status && data.contact.contacts.length > 0) {
    const valueForSocials = (type, value) => {
      switch (type) {
        case 'wabusiness':
        case 'whatsapp':
          return `https://wa.me/${value.replace(/\s/g, '')}`;
        case 'phone':
          return `tel:${value}`;
        case 'email':
          return `mailto:${value}`;
        case 'location':
          return `https://www.google.com/maps?q=${value}`;
        default:
          return;
      }
    };
    contact_me_label.innerHTML += generateContactMeLabel(data.contact.status);

    for (const contact of data.contact.contacts) {
      if (contact.type === 'email') {
        email = contact.value;
      } else if (contact.type === 'phone') {
        phoneNumber = contact.value;
      } else if (contact.type === 'location') {
        locationInfo = {
          street: contact.street,
          pincode: contact.pincode,
          value: contact.value,
        };
      } else if (contact.type === 'wabusiness') {
        whatsapp = contact.value;
      }
      contact_long_cards.innerHTML += generateLongContactCard(
        contact.label,
        contact.type,
        valueForSocials(contact.type, contact.value),
        contact.value
      );
    }

    if (whatsapp === null || whatsapp === undefined || whatsapp === '') {
      lets_chat_btn.style.display = 'none';
      document.getElementsByTagName('body')[0].style.marginBottom = '0px';
    }
  } else {
    lets_chat_btn.style.display = 'none';
    save_contact.style.display = 'none';
  }

  // social media links
  if (data.social && data.social.status && data.social.socials.length > 0) {
    const h4 = contact_section.querySelector('h4');
    h4.textContent = data.social.label ?? 'Social Media';
    var socials = data.social.socials;

    // Custom sorting function
    socials.sort((a, b) => {
      if (a.type === 'phone') {
        return -1; // "phone" comes before other types
      } else if (b.type === 'phone') {
        return 1; // "phone" comes before other types
      } else if (a.type === 'whatsapp') {
        return -1; // "whatsapp" comes after "phone"
      } else if (b.type === 'whatsapp') {
        return 1; // "whatsapp" comes after "phone"
      } else {
        return 0; // Keep the original order for other types
      }
    });

    socials.map((social) => {
      if (social.value) {
        contact_cards.innerHTML += generateContactCard(
          social.value,
          social.type
        );
      }
    });
  } else {
    document.getElementById('contact_section').classList.add('d_none');
  }

  save_contact.addEventListener('click', () => {
    createVCard(
      websites,
      name,
      company,
      designation,
      email,
      phoneNumber,
      locationInfo,
      socials,
      whatsapp
    );
  });

  lets_chat_btn.addEventListener('click', () => {
    sendHiToWhatsApp(whatsapp, bottom_fixed_btn_link);
  });

  enquiry_btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const id = data['_id'];

    const name_input = document.getElementById('name_input');
    const phone = document.getElementById('phone');
    const email_input = document.getElementById('email_input');
    const textarea = document.getElementById('textarea');
    const country_code = document.querySelector('.iti__selected-flag');
    const phone_input_wrapper = document.getElementById('phone_input_wrapper');
    phone_input_wrapper.style.borderRadius = '8px';

    if (!name_input.value) {
      name_input.style.border = '1px solid red';
    }
    if (!isPhoneNumber(phone.value)) {
      phone_input_wrapper.style.border = '1px solid red';
    }

    name_input.addEventListener('input', () => {
      name_input.style.border = '1px solid rgba(255, 255, 255, 0.20)';
    });
    phone.addEventListener('input', () => {
      phone_input_wrapper.style.border = '1px solid rgba(255, 255, 255, 0.20)';
    });
    email_input.addEventListener('input', () => {
      email_input.style.border = '1px solid rgba(255, 255, 255, 0.20)';
    });

    if (
      name_input.value &&
      isPhoneNumber(phone.value) &&
      isValidEmail(email_input.value)
    ) {
      let code = country_code.title.split(' ');
      code = code[code.length - 1];
      const data = {
        id: id,
        name: name_input.value,
        phone: code + phone.value,
        email: email_input.value,

        message: textarea.value,
      };
      try {
        const res = await fetch('/profile/submitForm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        const json = await res.json();

        if (json) {
          enquiry_btn.innerHTML = 'Submitted';
        }
      } catch (e) {
        enquiry_btn.innerHTML = "Can't submit form";
      }

      name_input.value = '';
      phone.value = '';
      email_input.value = '';
      textarea.value = '';
    }
  });

  function handleScroll() {
    var scrollButton = document.getElementById('scrollButton');
    if (window.pageYOffset > 200) {
      scrollButton.style.display = 'block';
    } else {
      scrollButton.style.display = 'none';
    }
  }

  window.addEventListener('scroll', handleScroll);

  window.addEventListener('scroll', function () {
    const scrollPosition = window.scrollY;
    const threshold = (40 * window.innerHeight) / 100; // 40vh in pixels

    if (scrollPosition > threshold) {
      lets_chat_btn.classList.add('visible');
    } else {
      lets_chat_btn.classList.remove('visible');
    }
  });

  new Glider(document.querySelector('.service_glider'), {
    slidesToShow: 1,
    draggable: true,
    dots: '#dots',

    scrollLock: false,
    // scrollLockDelay: 2000,
    resizeLock: true,

    scrollLockDelay: 150,

    scrollPropagate: false,
    eventPropagate: true,

    slidesToScroll: 1,

    // Set easing and duration for smooth slide transitions
    easing: function (x, t, b, c, d) {
      return c * (t /= d) * t + b;
    },
    duration: 800, // Adjust the duration for your preferred speed (in milliseconds)

    arrows: {
      prev: '.service_glider_prev',
      next: '.service_glider_next',
    },
  });

  // awards_slider
  new Glider(document.querySelector('.awards_slider'), {
    slidesToShow: 2,
    draggable: true,
    dots: '#dots',

    scrollLock: false,

    resizeLock: true,

    scrollLockDelay: 150,

    slidesToScroll: 1,

    duration: 1, // Adjust the duration for your preferred speed (in milliseconds)

    arrows: {
      prev: '.awards_glider_prev',
      next: '.awards_glider_next',
    },
  });
});
