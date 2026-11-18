import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração do Firebase
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

// ==========================================
// CONFIGURAÇÃO DA SENHA DA PROFESSORA
// ==========================================
const SENHA_PROFESSORA = "ielts2026"; // <--- Altere aqui para a senha que você preferir!

// Normaliza o nome ou e-mail da aluna para servir como ID seguro no Firestore
export function getStudentKey() {
    const raw = localStorage.getItem('ielts_current_student') || '';
    return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function getRawStudentName() {
    return (localStorage.getItem('ielts_current_student') || '').trim();
}

export function setStudentName(name) {
    localStorage.setItem('ielts_current_student', name.trim());
}

// Registra ou atualiza a existência da aluna na coleção principal para listagem no Modo Professor
export async function registerStudentActivity() {
    const key = getStudentKey();
    const raw = getRawStudentName();
    if (!key || !raw || !db) return;

    try {
        await setDoc(doc(db, "ielts_students", key), {
            displayName: raw,
            lastActive: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        console.error("Erro ao registrar atividade da aluna:", e);
    }
}

// Apaga todos os dados e subcoleções de uma aluna no Firestore
async function deleteCompleteStudentData(studentKey, displayName) {
    if (!studentKey || !db) return false;

    const subcollections = ["listening", "reading", "writing", "speaking", "manual_scores"];

    try {
        // 1. Apagar todos os documentos dentro de cada subcoleção da aluna
        for (const sub of subcollections) {
            const subColRef = collection(db, "ielts_students", studentKey, sub);
            const snapshot = await getDocs(subColRef);
            for (const docSnap of snapshot.docs) {
                await deleteDoc(docSnap.ref);
            }
        }

        // 2. Apagar o documento raiz da aluna
        await deleteDoc(doc(db, "ielts_students", studentKey));
        return true;
    } catch (error) {
        console.error("Erro ao excluir dados da aluna:", error);
        return false;
    }
}

// Injeta a barra superior de identificação de aluna e o Modo Professor em qualquer página
export function initStudentBar(onStudentChangeCallback) {
    const wrapper = document.querySelector('.main-wrapper');
    if (!wrapper) return;

    const bar = document.createElement('div');
    bar.id = 'student-manager-bar';
    bar.style.cssText = `
        background: #FFFFFF;
        border: 1px solid #D8B4D9;
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 8px rgba(80, 32, 100, 0.06);
        font-family: 'Century Gothic', sans-serif;
    `;

    bar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 260px;">
            <span style="font-size: 13px; font-weight: 700; color: #502064;">Aluna:</span>
            <input type="text" id="global-student-input" placeholder="Digite seu nome ou e-mail..." 
                style="flex: 1; padding: 7px 10px; border: 1px solid #E2D8E5; border-radius: 6px; font-size: 13px; font-family: inherit;">
            <button type="button" id="global-student-save-btn" 
                style="background: #502064; color: white; border: none; padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                Confirmar
            </button>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" id="teacher-mode-toggle" 
                style="background: transparent; color: #6B0F1A; border: 1px solid #6B0F1A; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                Modo Professor
            </button>
        </div>

        <div id="teacher-panel" style="display: none; width: 100%; border-top: 1px dashed #D8B4D9; padding-top: 12px; margin-top: 4px;">
            <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between;">
                <span style="font-size: 12px; font-weight: 700; color: #6B0F1A;">Selecionar Aluna para Visualizar / Corrigir:</span>
                <div style="display: flex; gap: 8px; flex: 1; max-width: 550px; flex-wrap: wrap;">
                    <select id="teacher-student-select" style="flex: 1; min-width: 180px; padding: 6px; border: 1px solid #E2D8E5; border-radius: 6px; font-size: 12px; font-family: inherit;">
                        <option value="">Carregando lista de alunas...</option>
                    </select>
                    <button type="button" id="teacher-refresh-btn" style="background: #6B3A7E; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                        Atualizar
                    </button>
                    <button type="button" id="teacher-delete-btn" style="background: #6B0F1A; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                        Excluir Aluna
                    </button>
                </div>
            </div>
        </div>
    `;

    wrapper.insertBefore(bar, wrapper.firstChild);

    const inputEl = document.getElementById('global-student-input');
    const saveBtn = document.getElementById('global-student-save-btn');
    const teacherBtn = document.getElementById('teacher-mode-toggle');
    const teacherPanel = document.getElementById('teacher-panel');
    const selectEl = document.getElementById('teacher-student-select');
    const refreshBtn = document.getElementById('teacher-refresh-btn');
    const deleteBtn = document.getElementById('teacher-delete-btn');

    // Preenche se já existir nome salvo
    inputEl.value = getRawStudentName();

    saveBtn.addEventListener('click', async () => {
        const val = inputEl.value.trim();
        if (!val) {
            alert("Por favor, digite seu nome ou e-mail para identificar suas atividades.");
            return;
        }
        setStudentName(val);
        await registerStudentActivity();
        if (onStudentChangeCallback) onStudentChangeCallback();
        
        saveBtn.textContent = "Ativo!";
        saveBtn.style.background = "#2e7d32";
        setTimeout(() => {
            saveBtn.textContent = "Confirmar";
            saveBtn.style.background = "#502064";
        }, 1500);
    });

    // Abre ou fecha o Modo Professor mediante senha
    teacherBtn.addEventListener('click', () => {
        const isVisible = teacherPanel.style.display === 'block';
        
        if (!isVisible) {
            const senhaDigitada = prompt("Área restrita. Digite a senha de professora:");
            if (senhaDigitada !== SENHA_PROFESSORA) {
                if (senhaDigitada !== null) alert("Senha incorreta!");
                return;
            }
        }

        teacherPanel.style.display = isVisible ? 'none' : 'block';
        teacherBtn.style.backgroundColor = isVisible ? 'transparent' : '#6B0F1A';
        teacherBtn.style.color = isVisible ? '#6B0F1A' : 'white';
        if (!isVisible) loadAllStudents();
    });

    async function loadAllStudents() {
        selectEl.innerHTML = '<option value="">Buscando alunas...</option>';
        try {
            const querySnapshot = await getDocs(collection(db, "ielts_students"));
            selectEl.innerHTML = '<option value="">-- Escolha uma aluna --</option>';
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const option = document.createElement('option');
                option.value = data.displayName || docSnap.id;
                option.dataset.key = docSnap.id;
                option.textContent = data.displayName || docSnap.id;
                if (docSnap.id === getStudentKey()) {
                    option.selected = true;
                }
                selectEl.appendChild(option);
            });
        } catch (e) {
            console.error("Erro ao listar alunas:", e);
            selectEl.innerHTML = '<option value="">Erro ao carregar lista</option>';
        }
    }

    selectEl.addEventListener('change', () => {
        const selectedName = selectEl.value;
        if (!selectedName) return;
        inputEl.value = selectedName;
        setStudentName(selectedName);
        if (onStudentChangeCallback) onStudentChangeCallback();
    });

    refreshBtn.addEventListener('click', loadAllStudents);

    // Excluir aluna selecionada e todo o histórico dela
    deleteBtn.addEventListener('click', async () => {
        const selectedOption = selectEl.options[selectEl.selectedIndex];
        const selectedName = selectEl.value;
        const selectedKey = selectedOption ? selectedOption.dataset.key : null;

        if (!selectedName || !selectedKey) {
            alert("Selecione uma aluna na lista antes de clicar em Excluir.");
            return;
        }

        const confirmacao = confirm(`ATENÇÃO: Tem certeza que deseja excluir PERMANENTEMENTE a aluna "${selectedName}" e TODAS as respostas/notas dela? Essa ação não pode ser desfeita.`);
        if (!confirmacao) return;

        deleteBtn.textContent = "Excluindo...";
        deleteBtn.disabled = true;

        const success = await deleteCompleteStudentData(selectedKey, selectedName);

        deleteBtn.textContent = "Excluir Aluna";
        deleteBtn.disabled = false;

        if (success) {
            alert(`Aluna "${selectedName}" e todos os seus dados foram removidos com sucesso.`);
            if (getStudentKey() === selectedKey) {
                localStorage.removeItem('ielts_current_student');
                inputEl.value = '';
                if (onStudentChangeCallback) onStudentChangeCallback();
            }
            loadAllStudents();
        } else {
            alert("Ocorreu um erro ao tentar excluir os dados da aluna.");
        }
    });
}
