import { db, auth, storage } from './firebase-config.js';

// DOM Elements
const loginForm = document.getElementById('admin-login-form');
const emailInput = document.getElementById('admin-email');
const passwordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');

// Admin Login
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    try {
        // Sign in with email/password
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Check if user is admin
        const userDoc = await db.collection('admins').doc(user.uid).get();
        
        if (userDoc.exists) {
            // Redirect to dashboard
            window.location.href = 'dashboard/products.html';
        } else {
            // Not an admin, sign out
            await auth.signOut();
            loginError.textContent = 'You do not have admin privileges';
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = error.message;
    }
});

// Check auth state on dashboard pages
auth.onAuthStateChanged(async (user) => {
    // If on login page and already logged in, redirect to dashboard
    if (window.location.pathname.includes('admin.html') && user) {
        const userDoc = await db.collection('admins').doc(user.uid).get();
        if (userDoc.exists) {
            window.location.href = 'dashboard/products.html';
        } else {
            await auth.signOut();
        }
    }
    
    // If on dashboard page and not logged in, redirect to login
    if (window.location.pathname.includes('dashboard/') && !user) {
        window.location.href = '../admin.html';
    }
});

// Dashboard functionality (only load on dashboard pages)
if (window.location.pathname.includes('dashboard/')) {
    // DOM Elements
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const logoutBtn = document.querySelector('.logout-btn');
    
    // Toggle sidebar on mobile
    menuToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    // Logout functionality
    logoutBtn?.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = '../admin.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    });
    
    // Load current admin user
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userDoc = await db.collection('admins').doc(user.uid).get();
            if (userDoc.exists) {
                const adminData = userDoc.data();
                // Update UI with admin info
                const profileName = document.querySelector('.user-profile .name');
                const profileEmail = document.querySelector('.user-profile .email');
                
                if (profileName) profileName.textContent = adminData.name;
                if (profileEmail) profileEmail.textContent = adminData.email;
            }
        }
    });
    
    // Products Page
    if (window.location.pathname.includes('products.html')) {
        const productsTable = document.querySelector('.products-table tbody');
        const addProductBtn = document.getElementById('add-product-btn');
        const productForm = document.getElementById('product-form');
        const productImagePreview = document.getElementById('product-image-preview');
        const productImageInput = document.getElementById('product-image');
        
        // Load products
        async function loadProducts() {
            try {
                const querySnapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
                productsTable.innerHTML = '';
                
                querySnapshot.forEach(doc => {
                    const product = doc.data();
                    const tr = document.createElement('tr');
                    
                    tr.innerHTML = `
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${product.image}" alt="${product.name}" width="40" height="40" style="object-fit: cover; border-radius: 4px; margin-right: 10px;">
                                ${product.name}
                            </div>
                        </td>
                        <td>${product.brand}</td>
                        <td>$${product.price.toFixed(2)}</td>
                        <td>${product.category}</td>
                        <td>
                            <span class="badge ${product.featured ? 'badge-success' : 'badge-secondary'}">
                                ${product.featured ? 'Yes' : 'No'}
                            </span>
                        </td>
                        <td>
                            <span class="badge ${product.onSale ? 'badge-success' : 'badge-secondary'}">
                                ${product.onSale ? 'Yes' : 'No'}
                            </span>
                        </td>
                        <td>${product.stock}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-product" data-id="${doc.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-product" data-id="${doc.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    
                    productsTable.appendChild(tr);
                });
                
                // Add event listeners to edit/delete buttons
                document.querySelectorAll('.edit-product').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const productId = e.currentTarget.getAttribute('data-id');
                        editProduct(productId);
                    });
                });
                
                document.querySelectorAll('.delete-product').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const productId = e.currentTarget.getAttribute('data-id');
                        deleteProduct(productId);
                    });
                });
                
            } catch (error) {
                console.error('Error loading products:', error);
                productsTable.innerHTML = '<tr><td colspan="8" class="text-center">Error loading products</td></tr>';
            }
        }
        
        // Edit product
        async function editProduct(productId) {
            try {
                const doc = await db.collection('products').doc(productId).get();
                if (doc.exists) {
                    const product = doc.data();
                    
                    // Fill form with product data
                    document.getElementById('product-id').value = productId;
                    document.getElementById('product-name').value = product.name;
                    document.getElementById('product-brand').value = product.brand;
                    document.getElementById('product-price').value = product.price;
                    document.getElementById('product-discount').value = product.discount || 0;
                    document.getElementById('product-category').value = product.category;
                    document.getElementById('product-description').value = product.description;
                    document.getElementById('product-specs').value = product.specs.join('\n');
                    document.getElementById('product-stock').value = product.stock;
                    document.getElementById('product-featured').checked = product.featured;
                    document.getElementById('product-onSale').checked = product.onSale;
                    
                    // Show image preview
                    productImagePreview.style.display = 'block';
                    productImagePreview.src = product.image;
                    
                    // Scroll to form
                    productForm.scrollIntoView({ behavior: 'smooth' });
                }
            } catch (error) {
                console.error('Error editing product:', error);
                alert('Error editing product');
            }
        }
        
        // Delete product
        async function deleteProduct(productId) {
            if (confirm('Are you sure you want to delete this product?')) {
                try {
                    await db.collection('products').doc(productId).delete();
                    loadProducts();
                    alert('Product deleted successfully');
                } catch (error) {
                    console.error('Error deleting product:', error);
                    alert('Error deleting product');
                }
            }
        }
        
        // Preview image when selected
        productImageInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    productImagePreview.style.display = 'block';
                    productImagePreview.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Save product
        productForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const productId = document.getElementById('product-id').value;
            const name = document.getElementById('product-name').value;
            const brand = document.getElementById('product-brand').value;
            const price = parseFloat(document.getElementById('product-price').value);
            const discount = parseInt(document.getElementById('product-discount').value) || 0;
            const category = document.getElementById('product-category').value;
            const description = document.getElementById('product-description').value;
            const specs = document.getElementById('product-specs').value.split('\n').filter(spec => spec.trim() !== '');
            const stock = parseInt(document.getElementById('product-stock').value);
            const featured = document.getElementById('product-featured').checked;
            const onSale = document.getElementById('product-onSale').checked;
            const imageFile = productImageInput.files[0];
            
            try {
                let imageUrl = productImagePreview.src;
                
                // If new image was uploaded
                if (imageFile) {
                    // Upload image to Firebase Storage
                    const storageRef = storage.ref(`products/${Date.now()}_${imageFile.name}`);
                    const uploadTask = await storageRef.put(imageFile);
                    imageUrl = await uploadTask.ref.getDownloadURL();
                }
                
                const productData = {
                    name,
                    brand,
                    price,
                    discount,
                    category,
                    description,
                    specs,
                    stock,
                    featured,
                    onSale,
                    image: imageUrl,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                if (productId) {
                    // Update existing product
                    await db.collection('products').doc(productId).update(productData);
                    alert('Product updated successfully');
                } else {
                    // Add new product
                    productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection('products').add(productData);
                    alert('Product added successfully');
                }
                
                // Reset form and reload products
                productForm.reset();
                productImagePreview.style.display = 'none';
                document.getElementById('product-id').value = '';
                loadProducts();
                
            } catch (error) {
                console.error('Error saving product:', error);
                alert('Error saving product');
            }
        });
        
        // Load products on page load
        loadProducts();
    }
    
    // Orders Page
    if (window.location.pathname.includes('orders.html')) {
        const ordersTable = document.querySelector('.orders-table tbody');
        
        // Load orders
        async function loadOrders() {
            try {
                const querySnapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
                ordersTable.innerHTML = '';
                
                querySnapshot.forEach(doc => {
                    const order = doc.data();
                    const tr = document.createElement('tr');
                    
                    // Format date
                    const orderDate = order.createdAt?.toDate();
                    const formattedDate = orderDate ? orderDate.toLocaleDateString() : 'N/A';
                    
                    // Calculate total items
                    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
                    
                    tr.innerHTML = `
                        <td>${doc.id.substring(0, 8)}</td>
                        <td>${formattedDate}</td>
                        <td>${order.userId.substring(0, 8)}</td>
                        <td>${totalItems}</td>
                        <td>$${order.total.toFixed(2)}</td>
                        <td>
                            <span class="status ${order.status}">${order.status}</span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary view-order" data-id="${doc.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success update-status" data-id="${doc.id}">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </td>
                    `;
                    
                    ordersTable.appendChild(tr);
                });
                
                // Add event listeners to view/update buttons
                document.querySelectorAll('.view-order').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const orderId = e.currentTarget.getAttribute('data-id');
                        viewOrder(orderId);
                    });
                });
                
                document.querySelectorAll('.update-status').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const orderId = e.currentTarget.getAttribute('data-id');
                        updateOrderStatus(orderId);
                    });
                });
                
            } catch (error) {
                console.error('Error loading orders:', error);
                ordersTable.innerHTML = '<tr><td colspan="7" class="text-center">Error loading orders</td></tr>';
            }
        }
        
        // View order details
        async function viewOrder(orderId) {
            try {
                const doc = await db.collection('orders').doc(orderId).get();
                if (doc.exists) {
                    const order = doc.data();
                    
                    // Format date
                    const orderDate = order.createdAt?.toDate();
                    const formattedDate = orderDate ? orderDate.toLocaleDateString() : 'N/A';
                    
                    // Create modal content
                    let itemsHtml = '';
                    order.items.forEach(item => {
                        itemsHtml += `
                            <div class="order-item">
                                <div class="d-flex align-items-center">
                                    <img src="${item.image}" alt="${item.name}" width="60" height="60" style="object-fit: cover; border-radius: 4px; margin-right: 15px;">
                                    <div>
                                        <h6>${item.name}</h6>
                                        <p class="text-muted">$${item.price.toFixed(2)} x ${item.quantity}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <strong>$${(item.price * item.quantity).toFixed(2)}</strong>
                                </div>
                            </div>
                        `;
                    });
                    
                    const modalContent = `
                        <div class="order-details">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h5>Order #${orderId.substring(0, 8)}</h5>
                                    <p class="text-muted">${formattedDate}</p>
                                </div>
                                <div class="col-md-6 text-right">
                                    <span class="status ${order.status}">${order.status}</span>
                                </div>
                            </div>
                            
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h6>Customer Information</h6>
                                    <p>User ID: ${order.userId}</p>
                                    ${order.shippingAddress ? `
                                        <p>${order.shippingAddress.street}</p>
                                        <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}</p>
                                        <p>${order.shippingAddress.country}</p>
                                    ` : '<p>No shipping address provided</p>'}
                                </div>
                                <div class="col-md-6">
                                    <h6>Payment Information</h6>
                                    <p>Method: ${order.paymentMethod}</p>
                                    <p>Subtotal: $${order.subtotal.toFixed(2)}</p>
                                    <p>Shipping: $${order.shipping.toFixed(2)}</p>
                                    <p>Tax: $${order.tax.toFixed(2)}</p>
                                    <p><strong>Total: $${order.total
