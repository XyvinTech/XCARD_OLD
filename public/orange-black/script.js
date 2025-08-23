const viewable = ['png', 'jpg', 'jpeg', 'gif', 'mov', 'svg', 'ico', 'webp'];
const data = JSON.parse(document.currentScript.getAttribute('data'));

const profile = data.profile;
const contacts =
  data.contact && data.contact.status && data.contact.contacts?.length > 0
    ? data.contact.contacts
    : null;
const upis =
  data.upi && data.upi.status && data.upi.upis?.length > 0
    ? data.upi.upis
    : null;
let socials =
  data.social && data.social.status && data.social.socials?.length > 0
    ? data.social.socials
    : null;
const websites =
  data.website &&
  data.website.status &&
  Array.isArray(data.website.websites) &&
  data.website.websites?.length > 0
    ? data.website.websites
    : null;
// Detect app store links inside socials and normalize them as social entries
(() => {
  if (socials && Array.isArray(socials)) {
    const { filteredSocials, detected } = extractAppsFromSocials(socials);
    socials = filteredSocials;
    // Push normalized app links back into socials so they display in Socials section
    detected.forEach((a) => {
      if (a.platform === 'ios') {
        socials.push({ label: 'App Store', value: a.link, type: 'appstore' });
      }
      if (a.platform === 'android') {
        socials.push({ label: 'Google Play', value: a.link, type: 'googleplay' });
      }
    });
  }
})();
const services =
  data.service && data.service.status && data.service.services?.length > 0
    ? data.service.services
    : null;
const products =
  data.product && data.product.status && data.product.products?.length > 0
    ? data.product.products
    : null;
const awards =
  data.award && data.award.status && data.award.awards?.length > 0
    ? data.award.awards
    : null;
const certificates =
  data.certificate &&
  data.certificate.status &&
  data.certificate.certificates?.length > 0
    ? data.certificate.certificates
    : null;
const videos =
  data.video && data.video.status && data.video.videos?.length > 0
    ? data.video.videos
    : null;
const documents =
  data.document && data.document.status && data.document.documents?.length > 0
    ? data.document.documents
    : null;
const bank =
  data.bank && data.bank.status && data.bank.bankDetails
    ? data.bank.bankDetails
    : null;

function run() {
  generateProfile();
  generateWebsites();
  // Apps are shown under Socials (no separate section)
  generateSocials();
  generateAwards();
  generateServices();
  generateProducts();
  generateBank();
  generateVideos();
  generateCertificates();
  generateCatalogues();
  generateUpis();
  generateEnquiry();
  
  // Double-check that enquiry form is hidden for restricted group
  hideEnquiryFormIfRestricted();
  
  // Final check after a short delay to handle any race conditions
  if (data.group && data.group === '689c7532d75d59a0d06966e3') {
    setTimeout(() => {
      hideEnquiryFormIfRestricted();
    }, 100);
  }
  
  setup();
}
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}
function handleScroll() {
  var scrollButton = document.getElementById('scrollButton');
  if (window.pageYOffset > 200) {
    scrollButton.style.display = 'block';
  } else {
    scrollButton.style.display = 'none';
  }
}

window.addEventListener('scroll', handleScroll);

document.addEventListener('DOMContentLoaded', () => {
  // Log the group ID for debugging
  console.log('Profile Group ID:', data.group);
  console.log('Full profile data:', data);
  
  // Check and hide enquiry form immediately if profile belongs to restricted group
  if (data.group && data.group === '689c7532d75d59a0d06966e3') {
    const enquirySection = document.getElementById('enquiry');
    if (enquirySection) {
      enquirySection.style.display = 'none';
      enquirySection.style.visibility = 'hidden';
      enquirySection.style.opacity = '0';
      enquirySection.classList.add('hidden');
      console.log('Enquiry form hidden on DOM load for group:', data.group);
    }
  }
  
  run();
  setContent();
});

function generateProfile() {
  const profileSection = document.getElementById('profile');
  if (!profile) {
    profileSection.style.display = 'none';
    return;
  }

  const card = profileSection.querySelector('.profile-card');

  card.innerHTML = `
  <img src="${
    profile.profileBanner?.public
      ? profile.profileBanner?.public
      : '/profile/public/orange-black/assets/orange-dark/card-bg.png'
  }" alt="card-bg" />
  <div class="info">
    <img
      class="profile-pic"
      src="${
        profile.profilePicture?.public
          ? profile.profilePicture?.public
          : '/profile/public/orange-black/assets/orange-dark/no_image.png'
      }"
      alt="profile-pic"
    />
    <h1>${profile.name ?? 'Fill Name'}</h1>
    <h2>${profile.designation ?? 'fill designation'} | ${
    profile.companyName
  }</h2>
    <p>
     ${profile.bio ?? ''}
    </p>
    <button class="btn btn-primary" id="save_contact_btn" target="_blank" href="${
      profile.profileLink ?? '#'
    }">
     <img src="/profile/public/orange-black/assets/orange-dark/icons/add-contact.svg" alt="add-contact">
      <span>Save Contact</span>
    </button>
  </div>
  `;

  const button = card.querySelector('button');

  let email = null;
  let phoneNumber = null;
  let locationInfo = null;
  let whatsapp = null;

  if (contacts) {
    for (const contact of contacts) {
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
    }
  } else {
    document.getElementById('save_contact_btn').style.display = 'none';
  }

  button.addEventListener('click', () =>
    createVCard(
      websites,
      profile.name,
      profile.companyName,
      profile.designation,
      email,
      phoneNumber,
      locationInfo,
      socials,
      whatsapp
    )
  );
}

function generateWebsites() {
  const websiteSection = document.getElementById('websites');
  if (!websites) {
    websiteSection.style.display = 'none';
    return;
  }

  // Select the <h2> element and change its text content
  const h2 = websiteSection.querySelector('h2');
  h2.textContent = data.website.label ?? 'Website';

  const ul = websiteSection.querySelector('ul');

  let content = '';
  websites.forEach((website) => {
    if (website.link && website.name) {
      content += `
      <li>
        <a class="website-card" target="_blank"  rel="noreferrer" href="${ensureHttps(
          website.link
        )}">
          <img src="/profile/public/orange-black/assets/orange-dark/icons/global.svg" alt="website" />
          <span class="text">${website.name}</span>
        </a>
      </li>
      `;
    }
  });

  if (content != '') {
    ul.innerHTML = content;
  } else {
    websiteSection.style.display = 'none';
  }
}
function generateAwards() {
  const awardSection = document.getElementById('awards');
  if (!awards) {
    awardSection.style.display = 'none';
    return;
  }
  const h2 = awardSection.querySelector('h2');
  h2.textContent = data.award.label ?? 'Awards';

  const ul = awardSection.querySelector('ul');

  awards.forEach((award) => {
    if (award.label) {
      const card = document.createElement('li');
      card.classList.add('award-card');
      card.innerHTML = `
        <img src="${
          award.image?.public ??
          '/profile/public/orange-black/assets/orange-dark/no_image.png'
        }" alt="award" />
        <h3>${award.label}</h3>
        ${award.value && '<p>' + shorten(award.value) + '</p>'}
      `;
      ul.appendChild(card);
      card.addEventListener('click', () =>
        openModal('award', {
          image: award.image?.public,
          heading: award.label,
          desc: award.value,
        })
      );
    }
  });
}
function generateServices() {
  const serviceSection = document.getElementById('services');
  if (!services) {
    serviceSection.style.display = 'none';
    return;
  }

  const h2 = serviceSection.querySelector('h2');
  h2.textContent = data.service.label ?? 'Services';

  const ul = serviceSection.querySelector('.glider');

  let content = '';
  services.forEach((service) => {
    if (service.label) {
      content += `
      <div class="service-card">
        <button>
          <img src="${
            service.image?.public
              ? service.image.public
              : '/profile/public/orange-black/assets/orange-dark/no_image.png'
          }" alt="service" />
          <h3>${service.label}</h3>
          <p>${shorten(service.description ?? '')}</p>
        </button>
      </div>
      `;
    }
  });

  if (content != '') {
    ul.innerHTML = content;
    const serviceButtons = ul.querySelectorAll('button');
    serviceButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        openModal('service', {
          image: services[index].image?.public,
          heading: services[index].label,
          desc: services[index].description,
          link: services[index].value,
        });
      });
    });
  } else {
    serviceSection.style.display = 'none';
  }
}
function generateProducts() {
  const productSection = document.getElementById('products');
  if (!products) {
    productSection.style.display = 'none';
    return;
  }

  const h2 = productSection.querySelector('h2');
  h2.textContent = data.product.label ?? 'Products';

  const ul = productSection.querySelector('.glider');

  let content = '';
  products.forEach((product) => {
    if (product.name) {
      content += `
      <div class="service-card">
        <button>
          <img src="${
            product.image?.public
              ? product.image.public
              : '/profile/public/orange-black/assets/orange-dark/no_image.png'
          }" alt="" />
          <h3>${product.name}</h3>
          <p>${shorten(product.description ?? '')}</p>
        </button>
      </div>
      `;
    }
  });

  if (content != '') {
    ul.innerHTML = content;
    const productButtons = ul.querySelectorAll('button');
    productButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        openModal('product', {
          image: products[index].image?.public,
          heading: products[index].name,
          desc: products[index].description,
          link: products[index].link,
          price: products[index].price,
          discount: products[index].offerPrice,
        });
      });
    });
  } else {
    serviceSection.style.display = 'none';
  }
}

function generateBank() {
  const bankSection = document.getElementById('bank');
  if (!bank) {
    bankSection.style.display = 'none';
    return;
  }

  const card = bankSection.querySelector('.main-card');

  card.innerHTML = `
         <h2 class="bank-name">${bank.bank}</h2>
          <p class="bank-branch">${bank.branch} Branch</p>
          <div class="bank-personal-details">
            <div class="bank-id">
              <h3>Name</h3>
              <p>${bank.name}</p>
            </div>
            <div class="bank-acc">
              <h3>Acc no</h3>
              <p>${bank.accnumber}</p>
            </div>
            <div class="bank-ifsc">
              <h3>IFSC Code</h3>
              <p>${bank.ifsc}</p>
            </div>
            <div class="bank-swift">
              <h3>Swift Code</h3>
              <p>${bank.swift}</p>
            </div>
            <div class="bank-vat">
              <h3>VAT Number</h3>
              <p>${bank.vat}</p>
            </div>
          </div>
  `;
}

function generateCatalogues() {
  const catalogueSection = document.querySelector('#catalogues');

  if (!documents) {
    catalogueSection.style.display = 'none';
    return;
  }

  const h2 = catalogueSection.querySelector('h2');
  h2.textContent = data.document.label ?? 'Catalogues';

  const ul = catalogueSection.querySelector('ul');

  ul.innerHTML = '';

  documents.forEach((doc) => {
    let icon = '';
    if (viewable.includes(doc.image.fileName.split('.')[1])) {
      icon = 'eye.svg';
      isViewableData = true;
    } else {
      icon = 'download.svg';
      isViewableData = false;
    }

    if (doc.image?.public) {
      const splittedFileName = doc.image?.fileName.split('.');
      let label = '';

      if (splittedFileName.length > 0) {
        label =
          doc.label === ''
            ? splittedFileName.slice(0, splittedFileName.length - 1).join('')
            : doc.label;
      }

      const li = document.createElement('li');
      li.innerHTML += `
    <div class="website-card">
      <div class="content">
        <img src="/profile/public/orange-black/assets/orange-dark/icons/pdf.svg" alt="" />
        <span class="text" style="word-break: break-all;">${label}</span>
      </div>
      <button class="action"><img src="/profile/public/orange-black/assets/orange-dark/icons/${icon}" alt="${icon}" /></button>
    </div>
    `;
      ul.appendChild(li);
      li.addEventListener('click', () => {
        downloadDocument(
          doc.image?.public,
          doc.image?.fileName,
          doc.image?.mimeType
        );
      });
    }
  });
}
function generateUpis() {
  const upiSection = document.querySelector('#upi');

  if (!upis) {
    upiSection.style.display = 'none';
    return;
  }

  const ul = upiSection.querySelector('ul');

  ul.innerHTML = '';

  upis.forEach((upi) => {
    const li = document.createElement('li');
    li.innerHTML += `
      <div class="website-card">
      <div class="content">
        <img src="/profile/public/orange-black/assets/orange-dark/icons/upi.png" alt="upi" />
        <span class="text">${upi.id}</span>
      </div>
      <button class="action">
        <img src="/profile/public/orange-black/assets/orange-dark/icons/copy.svg" alt="copy" />
      </button>
    </div>
    `;
    ul.appendChild(li);
    li.addEventListener('click', () => {
      copyToClipboard(upi.id, li);
    });
  });
}

function generateSocials() {
  console.log(socials);
  const socialSection = document.getElementById('socials');
  if (!socials && !contacts) {
    socialSection.style.display = 'none';
    return;
  }

  const large = [
    'phone',
    'whatsapp',
    'email',
    'gmail',
    'location',
    'wabusiness',
  ];
  const smallDiv = socialSection.querySelector('.small-cards');
  const largeDiv = socialSection.querySelector('.large-cards');

  largeDiv.innerHTML = '';
  smallDiv.innerHTML = '';

  if (socials) {
    socials.forEach((social) => {
      const card = document.createElement('div');
      card.classList.add('card');

      if (social.value === '') return;

      if (!large.includes(social.type)) {
        const inner = buildSocialCardInnerHTML(social);
        card.innerHTML = inner;
        largeDiv.appendChild(card);
      } else {
        const inner = buildSocialIconOnlyHTML(social);
        card.innerHTML = inner;

        smallDiv.append(card);
      }
    });
  }

  const wabusiness =
    contacts?.find((contact) => contact.type === 'wabusiness') ?? null;
  const phone = contacts?.find((contact) => contact.type === 'phone') ?? null;
  const email = contacts?.find((contact) => contact.type === 'email') ?? null;
  const location =
    contacts?.find((contact) => contact.type === 'location') ?? null;
  const whatsapp =
    contacts?.find((contact) => contact.type === 'whatsapp') ?? null;

  if (phone && phone.value?.trim() !== '') {
    smallDiv.innerHTML += `
    <div class="card">
          <a target="_blank" href="tel:${phone.value}">
            <img src="/profile/public/orange-black/assets/orange-dark/socials/phone.svg" alt="phone" />
          </a>
      </div>
    `;
  }

  if (email && email.value?.trim() !== '') {
    smallDiv.innerHTML += `
    <div class="card">
          <a target="_blank" href="mailto:${email.value}">
            <img src="/profile/public/orange-black/assets/orange-dark/socials/mail.svg" alt="email" />
          </a>
      </div>
    `;
  }

  if (wabusiness && wabusiness.value) {
    largeDiv.innerHTML += `
      <a target="_blank" href="https://wa.me/${wabusiness.value}?text=Hi" id="say-hello-btn" class="btn btn-secondary whatsapp-btn">
      <img
        src="/profile/public/orange-black/assets/orange-dark/icons/whatsapp-org.svg"
        alt="whatsapp"
      />
      <span>Let's Chat!</span>
    </a>
  `;

    smallDiv.innerHTML += `
    <div class="card">
      <a target="_blank" href="https://wa.me/${wabusiness.value}">
        <img src="/profile/public/orange-black/assets/orange-dark/socials/wp_b.svg" alt="wabusiness" />
      </a>
    </div>`;
  }

  if (location) {
    const query = location.value ?? location.street ?? '';

    smallDiv.innerHTML += `
    <div class="card">
      <a target="_blank" href="${
        location.pincode ??
        'https://www.google.com/maps?q=' + query.replace(/\s+/g, '+')
      }">
        <img src="/profile/public/orange-black/assets/orange-dark/socials/location.svg" alt="location" />
      </a>
    </div>`;
  }

  if (whatsapp && whatsapp.value?.trim() !== '') {
    smallDiv.innerHTML += `
    <div class="card">
        <a target="_blank" href="https://wa.me/${whatsapp.value}">
          <img src="/profile/public/orange-black/assets/orange-dark/socials/whatsapp.svg" alt="whatsapp" />
        </a>
    </div>
  `;
  }
}

function buildSocialCardInnerHTML(social){
  const iconHtml = getSocialIconHTML(social.type);
  const isApp = social.type === 'appstore' || social.type === 'googleplay';
  const title = isApp
    ? social.type === 'appstore'
      ? 'App Store'
      : 'Google Play'
    : social.type;
  const hasLabel = typeof social.label === 'string' && social.label.trim() !== '';
  const normalizedLabel = (social.label || '').trim().toLowerCase();
  const normalizedTitle = String(title || '').trim().toLowerCase();
  const isDuplicate = hasLabel && normalizedLabel === normalizedTitle;

  // Choose a single display line:
  // - Prefer label (with @ for non-app) when present and not duplicate
  // - Otherwise show title/type
  let displayText = title;
  if (hasLabel && !isDuplicate) {
    displayText = isApp ? social.label : `@${social.label}`;
  }
  return `
      <a target="_blank" href="${social.value}">
      ${iconHtml}
      <div>
        <p class="userid">${displayText}</p>
      </div>
    </a>
  `;
}

function buildSocialIconOnlyHTML(social){
  const iconHtml = getSocialIconHTML(social.type);
  return `
      <a target="_blank" href="${social.value}">
        ${iconHtml}
      </a>
  `;
}

function getSocialIconPath(type){
  const file = contactCardImg(type);
  // Use icons folder for app badges for better consistency
  if (type === 'appstore' || type === 'googleplay') {
    return `/profile/public/orange-black/assets/orange-dark/icons/${file}`;
  }
  return `/profile/public/orange-black/assets/orange-dark/socials/${file}`;
}

function getSocialIconHTML(type){
  if (type === 'googleplay') {
    return '<i class="bi bi-google-play app-icon" aria-label="Google Play"></i>';
  }
  if (type === 'appstore') {
    return '<i class="bi bi-apple app-icon" aria-label="App Store"></i>';
  }
  const path = getSocialIconPath(type);
  return `<img src="${path}" alt="${type}" />`;
}

function generateVideos() {
  const videoSection = document.querySelector('#videos');
  if (!videos) {
    videoSection.style.display = 'none';
    return;
  }

  const videoGlider = videoSection.querySelector('.video-glider');
  videoGlider.innerHTML = '';

  videos.forEach((video) => {
    const videoLink = video.link.split('/');
    videoGlider.innerHTML += `
    <div style="height: 11.375rem">
      <iframe
        width="100%"
        style="border-radius: 8px"
        height="100%"
        src="https://www.youtube.com/embed/${videoLink[videoLink.length - 1]}"
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    `;
  });
}

function generateCertificates() {
  const certificateSection = document.querySelector('#certificates');
  if (!certificates) {
    certificateSection.style.display = 'none';
    return;
  }
  const h2 = certificateSection.querySelector('h2');
  h2.textContent = data.certificate.label ?? 'Certifications';

  const ul = certificateSection.querySelector('ul');

  ul.innerHTML = '';

  certificates.forEach((cert) => {
    const li = document.createElement('li');

    li.innerHTML = `
    <li>
              <img
                src="${
                  cert.image?.public ??
                  '/profile/public/orange-black/assets/orange-dark/no_image.png'
                }"
                alt="certificate"
              />
              <h3>${cert.label}</h3>
            
    </li>
    `;

    ul.appendChild(li);
  });
}

// Helper function to hide enquiry form for restricted group
function hideEnquiryFormIfRestricted() {
  console.log('Checking group ID in helper function:', data.group);
  if (data.group && data.group === '689c7532d75d59a0d06966e3') {
    const enquirySection = document.getElementById('enquiry');
    if (enquirySection) {
      enquirySection.style.display = 'none';
      enquirySection.style.visibility = 'hidden';
      enquirySection.style.opacity = '0';
      enquirySection.classList.add('hidden');
      console.log('Enquiry form hidden by helper function for group:', data.group);
    }
  } else {
    console.log('Group ID does not match restricted group or is undefined');
  }
}

function generateEnquiry() {
  const id = data['_id'];
  
  // Check if profile belongs to the specific group and hide enquiry form
  if (data.group && data.group === '689c7532d75d59a0d06966e3') {
    const enquirySection = document.getElementById('enquiry');
    if (enquirySection) {
      enquirySection.style.display = 'none';
      enquirySection.style.visibility = 'hidden';
      enquirySection.style.opacity = '0';
      enquirySection.classList.add('hidden');
      console.log('Enquiry form hidden for group:', data.group);
    }
    return; // Exit early, don't set up the form
  }

  const form = document.querySelector('#enquiry form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name_input = document.getElementById('name');
    const phone = document.getElementById('phone');
    const email_input = document.getElementById('email');
    const textarea = document.getElementById('message');
    const country_code = document.querySelector('.iti__selected-flag');
    const phone_input_wrapper = document.getElementById('phone_wrapper');
    phone_input_wrapper.style.borderRadius = '8px';

    if (!name_input.value) {
      name_input.style.border = '1px solid red';
    }
    if (!isPhoneNumber(phone.value)) {
      phone_input_wrapper.style.border = '1px solid red';
    }

    name_input.addEventListener('input', () => {
      name_input.style.border = 'none';
    });
    phone.addEventListener('input', () => {
      phone_input_wrapper.style.border = 'none';
    });
    email_input.addEventListener('input', () => {
      email_input.style.border = 'none';
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

      const btn = e.target.querySelector('button');

      btn.innerHTML = `<img src="/profile/public/orange-black/assets/orange-dark/icons/loader.svg" class="loading" style="width:1.25rem;height:1.25rem" />`;
      btn.disabled = true;
      const info = document.querySelector('.form-info');
      const p = info.querySelector('#form-info');
      info.style.display = 'none';

      try {
        const res = await fetch('/profile/submitForm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        info.style.display = 'block';

        if (res.ok) {
          name_input.value = '';
          phone.value = '';
          email_input.value = '';
          textarea.value = '';
          p.innerText = 'Submitted successfully';
          p.style.color = 'green';
        } else {
          p.innerText = 'Something went wrong';
          p.style.color = 'tomato';
        }
      } catch (err) {
        p.innerText = 'Something went wrong';
        p.style.color = 'tomato';
        console.error(err);
      }

      btn.innerHTML = 'Submit';
      btn.disabled = false;
    }
  });
}

function closeModal() {
  const parent = document.querySelector('.modal');
  parent.classList.remove('active');
  parent.style.display = 'none';
}

function openModal(type, data) {
  const parent = document.querySelector('.modal');
  const modal = document.querySelector('.modal > .modal-content');
  let content = `<button class="close-button"><img src="/profile/public/orange-black/assets/orange-dark/icons/close.svg" alt="close"></button>
  <img class="w-full" src="${
    data.image ?? '/profile/public/orange-black/assets/orange-dark/no_image.png'
  }" alt="image"> <h2>${data.heading}</h2>
  <p class="description">${data.desc ?? ''}</p>`;

  if (type === 'product' && data.price) {
    content += `<p class="price"><span class="discount">${
      data.discount ? data.discount : data.price
    }</span>${
      data.discount ? '<span class="actual">' + data.price + '</span>' : ''
    }</p>`;
  }
  if (type !== 'award') {
    content += `<a class="btn btn-primary w-full" target="_blank" href="${data.link}">Know More</a>`;
  }

  modal.innerHTML = content;
  parent.style.display = 'flex';
  parent.classList.add('animate');
  const modalCloseBtn = modal.querySelector('.close-button');
  modalCloseBtn.addEventListener('click', () => {
    closeModal();
  });
}

function setup() {
  // Service Cards Glider

  const glider = new Glider(document.querySelector('.service-glider'), {
    slidesToScroll: 1,
    slidesToShow: 1.8,
    draggable: true,
    dots: '.dots-service',
  });

  const serviceCards = document.querySelectorAll('#services .service-card');

  const cardMap = new Map();

  const currentCard = document.querySelector('#current-services');

  const serviceObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio >= 0.98) {
          currentCard.textContent = cardMap.get(entry.target);
        }
      });
    },
    {
      threshold: 0.99,
    }
  );

  document.querySelector('#total-services').textContent = serviceCards.length;

  serviceCards.forEach((serviceCard, index) => {
    cardMap.set(serviceCard, index + 1);
    serviceObserver.observe(serviceCard);
  });

  // Video glider

  const videoGlider = new Glider(document.querySelector('.video-glider'), {
    slidesToScroll: 1,
    slidesToShow: 1.1,
    draggable: true,
    dots: '.dots-video',
  });

  // Product Glider

  const productGlider = new Glider(document.querySelector('.product-glider'), {
    slidesToScroll: 1,
    slidesToShow: 1.8,
    draggable: true,
    dots: '.dots-product',
  });

  const productCards = document.querySelectorAll('#products .service-card');

  document.querySelector('#total-products').textContent = productCards.length;
  const currentProduct = document.querySelector('#current-products');

  const productObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio >= 0.99) {
          currentProduct.textContent = cardMap.get(entry.target);
        }
      });
    },
    {
      threshold: 0.99,
    }
  );

  productCards.forEach((productCard, index) => {
    cardMap.set(productCard, index + 1);
    productObserver.observe(productCard);
  });

  const whatsappBtn = document.querySelector('.whatsapp-btn');

  const buttonObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (whatsappBtn) {
        if (entry.isIntersecting) {
          whatsappBtn.classList.remove('active');
        } else {
          whatsappBtn.classList.add('active');
        }
      }
    });
  });

  const btn = document.querySelector('#profile .profile-pic');

  buttonObserver.observe(btn);
}

function setContent() {
  const main = document.querySelector('main');
  const loader = document.getElementById('loader-page');

  loader.style.display = 'none';
  main.style.opacity = '1';
}

// Utils

function handleImage(imageUrl) {
  if (imageUrl === null) {
    imageUrl = '/profile/public/orange-black/assets/images/no_image.png';
  } else if (imageUrl.public === null || imageUrl.public === '') {
    imageUrl = '/profile/public/orange-black/assets/images/no_image.png';
  } else {
    imageUrl = imageUrl.public;
  }
  return imageUrl;
}

function downloadDocument(publicUrl, fileName, mimeType) {
  // Use the fetch API to fetch the document from the public URL
  window.location.href = publicUrl;
  // fetch(publicUrl)
  //   .then((response) => response.blob())
  //   .then((blob) => {
  //     // Create a URL for the blob data

  //     // Create an invisible anchor element

  //     // Set the anchor's href, download attribute, and click it to trigger the download

  //     // Clean up by removing the anchor element and revoking the blob URL
  //   })
  //   .catch((error) => {
  //     console.error("Error downloading document:", error);
  //   });
}

function copyToClipboard(text, li) {
  try {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        const img = li.querySelector('.action img');
        setTimeout(() => {
          if (img) {
            img.src =
              '/profile/public/orange-black/assets/orange-dark/icons/tick.svg';
          }
        }, 500);

        // After 2.5 seconds, change the button image back to "copy.svg"
        setTimeout(() => {
          if (img) {
            img.src =
              '/profile/public/orange-black/assets/orange-dark/icons/copy.svg';
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

function contactCardImg(label) {
  switch (label.toLowerCase()) {
    case 'instagram':
      return 'ig.svg';
    case 'linkedin':
      return 'linkedin.svg';
    case 'twitter':
      return 'x.svg';
    case 'facebook':
      return 'fb.svg';
    case 'x':
      return 'x.svg';
    case 'google':
      return 'google.svg';
    case 'phone':
      return 'call.svg';
    case 'dribble':
      return 'dribble.svg';
    case 'whatsapp':
      return 'whatsapp.svg';
    case 'email':
      return 'mail.svg';
    case 'gmail':
      return 'mail.svg';
    case 'whatsapp-business':
      return 'wp_b.svg';
    case 'youtube':
      return 'youtube.svg';
    case 'appstore':
      return 'appstore.svg';
    case 'googleplay':
      return 'playstore.svg';
    default:
      return 'global.svg';
  }
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

function isPhoneNumber(value) {
  return /^-?\d+(\.\d+)?$/.test(value) && value.length <= 15;
}
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function shorten(str) {
  if (str.length > 50) {
    str = str.substring(0, 50) + '...';
  }
  return str;
}

function ensureHttps(url) {
  // If URL already has a scheme (e.g., http, https, market, itms), leave it
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url)) {
    return url;
  }
  return 'https://' + url;
}

function extractAppsFromSocials(socials) {
  const detected = [];
  const filteredSocials = [];
  const androidRegex = /(play\.google\.com\/store|market:\/\/details)/i;
  const iosRegex = /(apps\.apple\.com|itunes\.apple\.com|itms-apps:\/\/)/i;

  for (const s of socials) {
    const value = s?.value || '';
    if (androidRegex.test(value)) {
      detected.push({ platform: 'android', link: value });
      continue;
    }
    if (iosRegex.test(value)) {
      detected.push({ platform: 'ios', link: value });
      continue;
    }
    filteredSocials.push(s);
  }
  return { filteredSocials, detected };
}

function mergeApps(target, source) {
  const seen = new Set(target.map((a) => `${a.platform}|${a.link}`));
  source.forEach((a) => {
    const key = `${a.platform}|${a.link}`;
    if (!seen.has(key)) {
      target.push(a);
      seen.add(key);
    }
  });
}
