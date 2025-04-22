import { db, auth } from './firebase-config.js';

// DOM Elements
const cartItemsContainer = document.getElementById('cart-items-container');
const cartEmpty = document.getElementById('cart-empty');
const subtotalElement = document.getElementById('subtotal');
const shippingElement = document.getElementById('shipping');
const taxElement = document.getElementById('tax');
const totalElement = document.getElementById('total');
const checkoutBtn = document.getElementById('checkout-btn');
const cartCount = document.getElementById('cart-count');
const loginBtn = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const closeBtns = document.querySelectorAll('.close-btn');

// Cart state
let cart = JSON.parse(localStorage.getItem('cart')) || [];
updateCartCount();

// Initialize the cart
renderCartItems();

// Modal Event Listeners
loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.style.display = 'block';
});

closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
    });
});

window.addEventListener('click', (e) => {
    if (e.target === loginModal) loginModal.style.display = 'none';
    if (e.target === registerModal) registerModal.style.display = 'none';
});

// Render cart items
function renderCartItems() {
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartEmpty.style.display = 'block';
        cartItemsContainer.style.display = 'none';
        updateCartSummary();
        return;
    }
    
    cartEmpty.style.display = 'none';
    cartItemsContainer.style.display = 'block';
    
    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <h3>${item.name}</h3>
                <p>$${item.price.toFixed(2)}</p>
                <div class="quantity-controls">
                    <button class="decrease-quantity" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="increase-quantity" data-id="${item.id}">+</button>
                </div>
            </div>
            <div class="cart-item-total">
                <p>$${(item.price * item.quantity).toFixed(2)}</p>
                <button class="remove-item" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        cartItemsContainer.appendChild(cartItem);
    });
    
    // Add event listeners
    document.querySelectorAll('.decrease-quantity').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.getAttribute('data-id');
            updateQuantity(productId, -1);
        });
    });
    
    document.querySelectorAll('.increase-quantity').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.getAttribute('data-id');
            updateQuantity(productId, 1);
        });
    });
    
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.closest('button').getAttribute('data-id');
            removeFromCart(productId);
        });
    });
    
    updateCartSummary();
}

// Update product quantity
function updateQuantity(productId, change) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex !== -1) {
        cart[itemIndex].quantity += change;
        
        // Remove item if quantity reaches 0
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
        
        // Update local storage and UI
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        renderCartItems();
    }
}

// Remove item from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCartItems();
    
    // Show notification
    showToast('Item removed from cart');
}

// Update cart summary
function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 0 ? 5.99 : 0;
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + shipping + tax;
    
    subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    shippingElement.textContent = `$${shipping.toFixed(2)}`;
    taxElement.textContent = `$${tax.toFixed(2)}`;
    totalElement.textContent = `$${total.toFixed(2)}`;
}

// Update cart count
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    if (cartCount) cartCount.textContent = count;
}

// Checkout functionality
checkoutBtn?.addEventListener('click', proceedToCheckout);

function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty!');
        return;
    }
    
    if (!auth.currentUser) {
        showToast('Please login to proceed to checkout');
        loginModal.style.display = 'block';
        return;
    }
    
    // Create order in Firebase
    const order = {
        userId: auth.currentUser.uid,
        items: cart,
        subtotal: parseFloat(subtotalElement.textContent.replace('$', '')),
        shipping: parseFloat(shippingElement.textContent.replace('$', '')),
        tax: parseFloat(taxElement.textContent.replace('$', '')),
        total: parseFloat(totalElement.textContent.replace('$', '')),
        status: 'pending',
        paymentMethod: 'credit_card',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    db.collection('orders').add(order)
        .then(docRef => {
            // Add order to user's orders
            return db.collection('users').doc(auth.currentUser.uid).update({
                orders: firebase.firestore.FieldValue.arrayUnion(docRef.id)
            });
        })
        .then(() => {
            // Clear cart
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            renderCartItems();
            
            // Show success message
            showToast('Order placed successfully!');
            
            // In a real app, you would redirect to order confirmation page
            // window.location.href = `order-confirmation.html?orderId=${docRef.id}`;
        })
        .catch(error => {
            console.error("Error creating order: ", error);
            showToast('Error placing order. Please try again.');
        });
}

// Show toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Add toast notification styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast-notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--primary-color);
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    .toast-notification.show {
        opacity: 1;
    }
`;
document.head.appendChild(toastStyles);

// Check auth state
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        loginBtn.innerHTML = `<i class="fas fa-user"></i> My Account`;
        loginBtn.onclick = (e) => {
            e.preventDefault();
            showUserDropdown();
        };
    } else {
        // No user is signed in
        loginBtn.innerHTML = `<i class="fas fa-user"></i> Login`;
        loginBtn.onclick = (e) => {
            e.preventDefault();
            loginModal.style.display = 'block';
        };
    }
});

function showUserDropdown() {
    const userDropdown = document.createElement('div');
    userDropdown.className = 'user-dropdown';
    userDropdown.innerHTML = `
        <a href="#" id="my-account"><i class="fas fa-user-circle"></i> My Account</a>
        <a href="#" id="my-orders"><i class="fas fa-box"></i> My Orders</a>
        <a href="#" id="my-wishlist"><i class="fas fa-heart"></i> Wishlist</a>
        <a href="#" id="logout"><i class="fas fa-sign-out-alt"></i> Logout</a>
    `;
    
    userDropdown.style.position = 'absolute';
    userDropdown.style.top = `${loginBtn.offsetTop + loginBtn.offsetHeight}px`;
    userDropdown.style.right = '20px';
    userDropdown.style.backgroundColor = 'white';
    userDropdown.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    userDropdown.style.borderRadius = '4px';
    userDropdown.style.padding = '0.5rem 0';
    userDropdown.style.zIndex = '1000';
    userDropdown.style.display = 'block';
    
    document.body.appendChild(userDropdown);
    
    // Add event listeners
    userDropdown.querySelector('#logout').addEventListener('click', () => {
        auth.signOut().then(() => {
            userDropdown.remove();
            showToast('Logged out successfully');
        });
    });
    
    userDropdown.querySelector('#my-account').addEventListener('click', () => {
        alert('Account management coming soon!');
        userDropdown.remove();
    });
    
    userDropdown.querySelector('#my-orders').addEventListener('click', () => {
        alert('Your orders will be shown here!');
        userDropdown.remove();
    });
    
    userDropdown.querySelector('#my-wishlist').addEventListener('click', () => {
        alert('Your wishlist will be shown here!');
        userDropdown.remove();
    });
    
    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!userDropdown.contains(e.target) && e.target !== loginBtn) {
                userDropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 100);
}
