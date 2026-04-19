const dugmeSacuvaj = document.getElementById("dugmeSacuvaj");
const dugmeUredi = document.getElementById("dugmeUredi");
const formaRecept = document.getElementById("formaRecept");

const pretragaUnos = document.getElementById("pretraga");
const filterKategorija = document.getElementById("filterKategorija");
const filterGrupa = document.getElementById("filterGrupa");
const filterAutor = document.getElementById("filterAutor");

const listaRecepata = document.getElementById("listaRecepata");
const brojRecepata = document.getElementById("brojRecepata");

const imeUnos = document.getElementById("ime");
const kategorijaUnos = document.getElementById("kategorija");
const grupaUnos = document.getElementById("grupa");
const autorUnos = document.getElementById("autor");
const sastojciUnos = document.getElementById("sastojci");
const pripremaUnos = document.getElementById("priprema");
const slikeUnos = document.getElementById("slike");

let recepti = ucitajRecepte();
let receptZaUredjivanjeId = null;
let trenutniImageUrl = "";

prikaziRecepte();

function ucitajRecepte() {
  try {
    const sacuvaniRecepti = localStorage.getItem("family_cook_recepti");
    return sacuvaniRecepti ? JSON.parse(sacuvaniRecepti) : [];
  } catch (greska) {
    return [];
  }
}

function sacuvajRecepte() {
  localStorage.setItem("family_cook_recepti", JSON.stringify(recepti));
}

async function posaljiReceptUFirebase(recept) {
  try {
    const id = recept.id ? String(recept.id) : Date.now().toString();

    await db.collection("recepti").doc(id).set({
      ...recept,
      id: id
    });
  } catch (greska) {
    console.error("Greška pri slanju recepta u Firebase:", greska);
    alert("Recept je sačuvan lokalno, ali nije poslan u Firebase.");
  }
}

async function uploadSlikeUFirebase(file, receptId) {
  try {
    if (!file) return "";

    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child("recepti/" + receptId + "/" + file.name);

    await fileRef.put(file);
    const imageUrl = await fileRef.getDownloadURL();

    return imageUrl;
  } catch (greska) {
    console.error("Greška pri uploadu slike:", greska);
    return "";
  }
}

async function testUpload() {
  try {
    const file = slikeUnos && slikeUnos.files.length > 0 ? slikeUnos.files[0] : null;

    if (!file) {
      alert("Nisi izabrala sliku!");
      return;
    }

    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child("test/" + Date.now() + "_" + file.name);

    alert("KRECEM UPLOAD");
    await fileRef.put(file);
    alert("UPLOAD GOTOV");

    const url = await fileRef.getDownloadURL();
    alert("URL: " + url);
  } catch (greska) {
    console.error(greska);
    alert("GRESKA: " + greska.message);
  }
}

function resetujFormu() {
  formaRecept.reset();
  receptZaUredjivanjeId = null;
  trenutniImageUrl = "";
  dugmeSacuvaj.style.display = "inline-block";
  dugmeUredi.style.display = "none";

  if (slikeUnos) {
    slikeUnos.value = "";
  }
}

formaRecept.addEventListener("submit", async function (dogadjaj) {
  dogadjaj.preventDefault();

  const receptId = Date.now();
  const file = slikeUnos && slikeUnos.files.length > 0 ? slikeUnos.files[0] : null;

  let imageUrl = "";

  if (file) {
    imageUrl = await uploadSlikeUFirebase(file, receptId);
  }

  const noviRecept = {
    id: receptId,
    ime: imeUnos.value.trim(),
    kategorija: kategorijaUnos.value,
    grupa: grupaUnos.value,
    autor: autorUnos.value.trim(),
    sastojci: sastojciUnos.value.trim(),
    priprema: pripremaUnos.value.trim(),
    datumKreiranja: new Date().toLocaleDateString("bs-BA"),
    imageUrl: imageUrl
  };

  recepti.unshift(noviRecept);
  sacuvajRecepte();
  await posaljiReceptUFirebase(noviRecept);
  resetujFormu();
  prikaziRecepte();
});

dugmeUredi.addEventListener("click", async function () {
  if (receptZaUredjivanjeId === null) return;

  const indexRecepta = recepti.findIndex(function (recept) {
    return String(recept.id) === String(receptZaUredjivanjeId);
  });

  if (indexRecepta === -1) return;

  let imageUrl = recepti[indexRecepta].imageUrl || trenutniImageUrl || "";
  const file = slikeUnos && slikeUnos.files.length > 0 ? slikeUnos.files[0] : null;

  if (file) {
    imageUrl = await uploadSlikeUFirebase(file, receptZaUredjivanjeId);
  }

  recepti[indexRecepta] = {
    ...recepti[indexRecepta],
    ime: imeUnos.value.trim(),
    kategorija: String(kategorijaUnos.value).trim(),
    grupa: String(grupaUnos.value).trim(),
    autor: autorUnos.value.trim(),
    sastojci: sastojciUnos.value.trim(),
    priprema: pripremaUnos.value.trim(),
    imageUrl: imageUrl
  };

  sacuvajRecepte();
  await posaljiReceptUFirebase(recepti[indexRecepta]);
  resetujFormu();
  prikaziRecepte();
});

pretragaUnos.addEventListener("input", prikaziRecepte);
filterKategorija.addEventListener("change", prikaziRecepte);
filterGrupa.addEventListener("change", prikaziRecepte);

if (filterAutor) {
  filterAutor.addEventListener("input", prikaziRecepte);
}

listaRecepata.addEventListener("click", function (dogadjaj) {
  const dugme = dogadjaj.target.closest(".dugme-uredi");
  if (!dugme) return;

  const id = dugme.dataset.id;

  const recept = recepti.find(function (r) {
    return String(r.id) === String(id);
  });

  if (!recept) return;

  imeUnos.value = recept.ime || "";
  kategorijaUnos.value = recept.kategorija || "";
  grupaUnos.value = recept.grupa || "";
  autorUnos.value = recept.autor || "";
  sastojciUnos.value = recept.sastojci || "";
  pripremaUnos.value = recept.priprema || "";

  trenutniImageUrl = recept.imageUrl || "";
  receptZaUredjivanjeId = recept.id;

  dugmeSacuvaj.style.display = "none";
  dugmeUredi.style.display = "inline-block";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

function prikaziRecepte() {
  const vrijednostPretrage = pretragaUnos.value.toLowerCase().trim();
  const vrijednostKategorije = filterKategorija.value;
  const vrijednostGrupe = filterGrupa.value;
  const vrijednostAutora = filterAutor ? filterAutor.value.toLowerCase().trim() : "";

  const filtriraniRecepti = recepti.filter(function (recept) {
    const poklapaSeIme = (recept.ime || "").toLowerCase().includes(vrijednostPretrage);
    const poklapaSeKategorija =
      vrijednostKategorije === "sve" || recept.kategorija === vrijednostKategorije;
    const poklapaSeGrupa =
      vrijednostGrupe === "sve" || recept.grupa === vrijednostGrupe;
    const poklapaSeAutor =
      (recept.autor || "").toLowerCase().includes(vrijednostAutora);

    return poklapaSeIme && poklapaSeKategorija && poklapaSeGrupa && poklapaSeAutor;
  });

  brojRecepata.textContent = `Ukupno recepata: ${filtriraniRecepti.length}`;

  if (filtriraniRecepti.length === 0) {
    listaRecepata.innerHTML = `
      <div class="prazno">
        Nema recepata za prikaz.
      </div>
    `;
    return;
  }

  listaRecepata.innerHTML = filtriraniRecepti
    .map(function (recept) {
      const slikaHtml = recept.imageUrl
        ? `
          <div class="recept-dio">
            <img
              src="${siguranTekst(recept.imageUrl)}"
              alt="${siguranTekst(recept.ime)}"
              style="width: 100%; max-width: 320px; max-height: 240px; object-fit: cover; border-radius: 12px; margin-bottom: 12px;"
            >
          </div>
        `
        : "";

      return `
        <article class="recept-kartica">
          <div class="naslov-red">
            <h3>${siguranTekst(recept.ime)}</h3>
            <button type="button" class="dugme-uredi" data-id="${recept.id}">Uredi</button>
          </div>

          <div class="oznaka-red">
            <span class="oznaka">${siguranTekst(recept.kategorija || "Bez kategorije")}</span>
            <span class="oznaka">${siguranTekst(recept.grupa || "Bez grupe jela")}</span>
            <span class="oznaka">${siguranTekst(recept.autor || "Nepoznat autor")}</span>
          </div>

          ${slikaHtml}

          <div class="recept-dio">
            <strong>Sastojci</strong>
            <div>${pretvoriNoviRed(recept.sastojci)}</div>
          </div>

          <div class="recept-dio">
            <strong>Priprema</strong>
            <div>${pretvoriNoviRed(recept.priprema)}</div>
          </div>
        </article>
      `;
    })
    .join("");
}

function pretvoriNoviRed(tekst) {
  return siguranTekst(tekst || "").replace(/\n/g, "<br>");
}

function siguranTekst(tekst) {
  return String(tekst)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function prebaciRecepteUFirebase() {
  const receptiZaPrebacivanje = ucitajRecepte();

  if (!receptiZaPrebacivanje || receptiZaPrebacivanje.length === 0) {
    alert("Nema recepata za prebacivanje.");
    return;
  }

  try {
    for (const recept of receptiZaPrebacivanje) {
      const id = recept.id ? String(recept.id) : Date.now().toString();

      await db.collection("recepti").doc(id).set(recept);
    }

    alert("Recepti su poslani u Firebase.");
  } catch (greska) {
    console.error(greska);
    alert("Greška pri slanju u Firebase.");
  }
}

async function ucitajRecepteIzFirebase() {
  try {
    const snapshot = await db.collection("recepti").get();

    const firebaseRecepti = snapshot.docs.map(function (doc) {
      return doc.data();
    });

    recepti = firebaseRecepti;
    sacuvajRecepte();
    prikaziRecepte();
  } catch (greska) {
    console.error("Greška pri učitavanju iz Firebase:", greska);
    alert("Greška pri učitavanju recepata iz Firebase.");
  }
}

window.testUpload = testUpload;
window.ucitajRecepteIzFirebase = ucitajRecepteIzFirebase;