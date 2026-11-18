// student-manager.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC2pSWdBIREaPmpOvaiNzZWGUuCEupxp1c",
    authDomain: "studendtrackerpanel.firebaseapp.com",
    projectId: "studendtrackerpanel",
    storageBucket: "studendtrackerpanel.firebasestorage.app",
    messagingSenderId: "1004678184015",
    appId: "1:1004678184015:web:be965625c08d8ee73ffe3a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Gera uma chave segura para o Firestore a partir do nome/e-mail
export function getStudentKey() {
    const raw = (localStorage.getItem('ielts_student_identity') || '').trim().toLowerCase();
    if (!raw) return null;
    return raw.replace(/[^a-z0-9]/g, '_');
}

export function getRawStudentName() {
    return (localStorage.getItem('ielts_student_identity') || '').trim();
}

// Injeta automaticamente a barra de identificação e o Modo Professor em qualquer página
export function initStudentBar(onStudentChangeCallback) {
    const nav = document.querySelector('.top-nav');
    if (!nav) return;

    const barHTML = `
        <div id="global-identity-bar" style="background: #FFFFFF; border: 1px solid #D8B4D9; border-radius: 10px; padding: 14px 20px; margin-bottom: 20px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 2px 8px rgba(80, 32, 100, 0.05);">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 260px;">
                <label for="global-student-input" style="font-size: 13px; font-weight: 700; color: #502064; white-space: nowrap;">Aluna (Nome ou E-mail):</label>
                <input type="text" id="global-student-input" placeholder="Digite seu nome completo ou e-mail..." style="flex: 1; padding: 8px 12px; border: 1px solid #E2D8E5; border-radius: 6px; font-family: inherit; font-size: 13px;">
                <button type="button" id="global-confirm-btn" style="padding: 8px 16px; background-color: #502064; color: white; border: none; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; font-family: inherit;">Confirmar</button>
            </div>
            <button type="button" id="global-teacher-btn" style="padding: 8px 14px; background-color: transparent; color: #6B0F1A; border: 1px solid #6B0F1A; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; font-family: inherit;">Modo Professor</button>
        </div>

        <div id="global-teacher-panel" style="display: none; background-color: #FBF8FC; border: 1px solid #6B0F1A; border-radius: 10px; padding: 15px 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #6B0F1A; font-size: 14px;">Alunas cadastradas (Clique para ver as respostas dela):</h4>
                <button type="button" id="global-refresh-btn" style="padding: 4px 10px; background: #502064; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer;">Atualizar Lista</button>
            </div>
            <div id="global-student-chips" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
        </div>
    `;

    nav.insertAdjacentHTML('afterend', barHTML);

    const input = document.getElementById('global-student-input');
    const confirmBtn = document.getElementById('global-confirm-btn');
    const teacherBtn = document.getElementById('global-teacher-btn');
    const teacherPanel = document.getElementById('global-teacher-panel');
    const refreshBtn = document.getElementById('global-refresh-btn');

    // Preenche se já estiver salvo no navegador
    input.value = getRawStudentName();

    confirmBtn.addEventListener('click', async () => {
        const val = input.value.trim();
        if (!val) {
            alert("Por favor, digite seu nome ou e-mail.");
            return;
        }
        localStorage.setItem('ielts_student_identity', val);
        const key = getStudentKey();
        
        // Registra a aluna na nuvem imediatamente
        try {
            await setDoc(doc(db, "ielts_students", key), {
                displayName: val,
                lastActive: new Date().toISOString()
            }, { merge: true });
        } catch (e) { console.error(e); }

        if (onStudentChangeCallback) onStudentChangeCallback();
    });

    teacherBtn.addEventListener('click', () => {
        const isVisible = teacherPanel.style.display === 'block';
        teacherPanel.style.display = isVisible ? 'none' : 'block';
        teacherBtn.style.backgroundColor = isVisible ? 'transparent' : '#6B0F1A';
        teacherBtn.style.color = isVisible ? '#6B0F1A' : 'white';
        if (!isVisible) loadAllStudents();
    });

    refreshBtn.addEventListener('click', loadAllStudents);

    async function loadAllStudents() {
        const container = document.getElementById('global-student-chips');
        container.innerHTML = '<span style="font-size: 12px; color: #6B3A7E;">Buscando alunas...</span>';
        try {
            const snap = await getDocs(collection(db, "ielts_students"));
            container.innerHTML = '';
            if (snap.empty) {
                container.innerHTML = '<span style="font-size: 12px; color: #6B3A7E;">Nenhuma aluna registrada ainda.</span>';
                return;
            }
            snap.forEach(docSnap => {
                const name = docSnap.data().displayName || docSnap.id;
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.textContent = name;
                chip.style.cssText = "padding: 6px 12px; background: white; border: 1px solid #E2D8E5; border-radius: 20px; font-size: 12px; font-weight: 700; color: #502064; cursor: pointer;";
                chip.onclick = () => {
                    localStorage.setItem('ielts_student_identity', name);
                    input.value = name;
                    if (onStudentChangeCallback) onStudentChangeCallback();
                };
                container.appendChild(chip);
            });
        } catch (e) {
            container.innerHTML = '<span style="font-size: 12px; color: red;">Erro ao carregar lista.</span>';
        }
    }
}
