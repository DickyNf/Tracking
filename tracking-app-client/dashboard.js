document.addEventListener('DOMContentLoaded', function() {
    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    // Jika tidak ada token atau data user, redirect ke halaman login
    if (!authToken || !userData) {
        window.location.href = 'index.html';
        return;
    }

    const userRoleElement = document.getElementById('userRole');
    const logoutButton = document.getElementById('logoutButton');

    userRoleElement.textContent = `${userData.username} (${userData.role})`;

    // Tampilkan view yang sesuai dengan role
    if (userData.role === 'admin_auth') {
        // Admin Auth bisa melihat view monitoring dan otorisasi
        document.getElementById('admin_view-view').style.display = 'block';
        document.getElementById('admin_auth-view').style.display = 'block';
    } else {
        const roleView = document.getElementById(`${userData.role}-view`);
        if (roleView) {
            roleView.style.display = 'block';
        }
    }

    // Fungsi Logout
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    });

    // ================== LOGIKA UNTUK PEGAWAI ==================
    if (userData.role === 'pegawai') {
        const scanForm = document.getElementById('scanForm');
        const scanMessage = document.getElementById('scan-message');
        const historyTableBody = document.querySelector('#pegawai-history-table tbody');

        // Coba dapatkan lokasi GPS
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                document.getElementById('latitude').value = position.coords.latitude;
                document.getElementById('longitude').value = position.coords.longitude;
            }, () => {
                console.warn('GPS tidak dapat diakses. Mohon isi lokasi manual.');
            });
        }

        // Kirim data scan
        scanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            scanMessage.textContent = '';

            const scanData = {
                transaction_no: document.getElementById('transaction_no').value,
                status: document.getElementById('status').value,
                location_name: document.getElementById('location_name').value,
                latitude: document.getElementById('latitude').value,
                longitude: document.getElementById('longitude').value,
            };

            try {
                const response = await fetch('http://localhost:3000/api/tracking/scan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(scanData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                scanMessage.textContent = 'Laporan berhasil dikirim!';
                scanMessage.style.color = 'green';
                scanForm.reset(); // Kosongkan form
                loadPegawaiHistory(); // Muat ulang riwayat
            } catch (error) {
                scanMessage.textContent = `Error: ${error.message}`;
                scanMessage.style.color = 'red';
            }
        });

        // Muat riwayat scan
        async function loadPegawaiHistory() {
            try {
                const response = await fetch('http://localhost:3000/api/tracking/history', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                historyTableBody.innerHTML = ''; // Kosongkan tabel
                result.data.forEach(item => {
                    const row = `<tr>
                        <td>${new Date(item.scanned_at).toLocaleString()}</td>
                        <td>${item.transaction_no}</td>
                        <td>${item.status}</td>
                        <td>${item.location_name}</td>
                    </tr>`;
                    historyTableBody.innerHTML += row;
                });
            } catch (error) {
                historyTableBody.innerHTML = `<tr><td colspan="4">Gagal memuat riwayat: ${error.message}</td></tr>`;
            }
        }

        loadPegawaiHistory();
    }

    // ================== LOGIKA UNTUK ADMIN VIEW ==================
    if (userData.role === 'admin_view' || userData.role === 'admin_auth') {
        const filterForm = document.getElementById('admin-filter-form');
        const transactionsTableBody = document.querySelector('#admin-transactions-table tbody');
        const modal = document.getElementById('details-modal');
        const closeModalButton = document.querySelector('.close-button');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        // Muat transaksi dengan filter
        async function loadTransactions(params = {}) {
            try {
                const query = new URLSearchParams(params).toString();
                const response = await fetch(`http://localhost:3000/api/admin/transactions?${query}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                transactionsTableBody.innerHTML = ''; // Kosongkan tabel
                result.data.forEach(t => {
                    const row = `<tr>
                        <td>${t.transaction_no}</td>
                        <td>${t.current_status}</td>
                        <td>${new Date(t.last_update).toLocaleString()}</td>
                        <td>${t.last_scanned_by || '-'}</td>
                        <td><button class="view-details-btn" data-id="${t.transaction_no}">Lihat Detail</button></td>
                    </tr>`;
                    transactionsTableBody.innerHTML += row;
                });
            } catch (error) {
                transactionsTableBody.innerHTML = `<tr><td colspan="5">Gagal memuat transaksi: ${error.message}</td></tr>`;
            }
        }

        // Event listener untuk filter
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const params = {
                status: document.getElementById('filter-status').value,
                pegawai: document.getElementById('filter-pegawai').value,
                date: document.getElementById('filter-date').value
            };
            // Hapus parameter yang kosong
            Object.keys(params).forEach(key => params[key] === '' && delete params[key]);
            loadTransactions(params);
        });

        // Event listener untuk tombol detail (delegasi event)
        transactionsTableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('view-details-btn')) {
                const trxId = e.target.dataset.id;
                await showTransactionDetails(trxId);
            }
        });

        // Tampilkan detail di modal
        async function showTransactionDetails(transactionNo) {
            try {
                const response = await fetch(`http://localhost:3000/api/admin/transactions/${transactionNo}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                modalTitle.textContent = `Detail Transaksi: ${result.data.transaction_no}`;

                let timelineHTML = '<h4>Timeline:</h4><ul>';
                result.data.timeline.forEach(item => {
                    timelineHTML += `<li>
                        <strong>${item.status}</strong> on ${new Date(item.scanned_at).toLocaleString()}
                        <br>at ${item.location_name} by ${item.scanned_by}
                        <br>Authorized: ${item.authorized ? 'Yes' : 'No'}
                    </li>`;
                });
                timelineHTML += '</ul>';

                modalBody.innerHTML = timelineHTML;
                modal.style.display = 'block';

            } catch (error) {
                alert(`Gagal memuat detail: ${error.message}`);
            }
        }

        // Fungsionalitas modal
        closeModalButton.onclick = () => modal.style.display = "none";
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        };

        // Muat data awal
        loadTransactions();
    }

    // ================== LOGIKA UNTUK ADMIN AUTH ==================
    if (userData.role === 'admin_auth') {
        const authTableBody = document.querySelector('#admin-auth-table tbody');

        async function loadPendingAuthorizations() {
            try {
                const response = await fetch('http://localhost:3000/api/admin/authorizations', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                authTableBody.innerHTML = '';
                if(result.data.length === 0){
                    authTableBody.innerHTML = `<tr><td colspan="5">Tidak ada pembaruan yang menunggu otorisasi.</td></tr>`;
                }

                result.data.forEach(item => {
                    const row = `<tr>
                        <td>${new Date(item.scanned_at).toLocaleString()}</td>
                        <td>${item.transaction_no}</td>
                        <td>${item.status}</td>
                        <td>${item.scanned_by}</td>
                        <td>
                            <button class="auth-btn approve" data-id="${item.id}">Setujui</button>
                            <button class="auth-btn reject" data-id="${item.id}">Tolak</button>
                        </td>
                    </tr>`;
                    authTableBody.innerHTML += row;
                });
            } catch (error) {
                authTableBody.innerHTML = `<tr><td colspan="5">Gagal memuat data otorisasi: ${error.message}</td></tr>`;
            }
        }

        // Event listener untuk tombol otorisasi
        authTableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('auth-btn')) {
                const updateId = e.target.dataset.id;
                const action = e.target.classList.contains('approve') ? 'authorize' : 'reject';

                const notes = action === 'reject' ? prompt('Masukkan alasan penolakan:') : '';
                if (action === 'reject' && notes === null) return; // Batal jika prompt dibatalkan

                try {
                    const response = await fetch(`http://localhost:3000/api/admin/authorizations/${updateId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({ action, notes })
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);

                    alert(`Tindakan "${action}" berhasil.`);
                    loadPendingAuthorizations(); // Muat ulang daftar
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        });

        loadPendingAuthorizations();
    }
});
