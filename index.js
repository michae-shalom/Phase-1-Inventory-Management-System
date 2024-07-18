document.addEventListener('DOMContentLoaded', () => {
    const inventoryContainer = document.getElementById('inventory-container');
    const addItemForm = document.getElementById('add-item-form');
    const itemNameInput = document.getElementById('item-name');
    const itemQuantityInput = document.getElementById('item-quantity');
    const itemCategorySelect = document.getElementById('item-category');
    const searchInput = document.getElementById('search-input');
    const stockTrackerBody = document.getElementById('stock-tracker-body');
  
    let inventory = []; // To store fetched inventory data
  
    // Function to fetch categories from the server or define them locally
    function fetchCategories() {
      // Simulated list of categories
      const categories = [
        'Syrups', 'Tablets', 'Capsules', 'Safety Equipment',
        'Solutions', 'Ointment', 'Others'
      ];
  
      // Populate dropdown options
      categories.forEach(category => {
        const option = document.createElement('option');
        option.textContent = category;
        option.value = category.toLowerCase().replace(/\s+/g, '-');
        itemCategorySelect.appendChild(option);
      });
    }
  
    // Call fetchCategories on page load
    fetchCategories();
  
    // Fetch inventory data from json-server
    function fetchInventory() {
      fetch('http://localhost:3000/inventory')
        .then(response => response.json())
        .then(data => {
          inventory = data; // Store fetched inventory data
          displayInventory(inventory);
        });
    }
  
    // Display inventory items
    function displayInventory(items) {
      inventoryContainer.innerHTML = '';
      items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('inventory-item');
        itemDiv.innerHTML = `
          <span>${item.name} (${item.category})</span>
          <span>Quantity: ${item.quantity}</span>
          <input type="number" class="add-stock-input" placeholder="Add stock" data-id="${item.id}">
          <button data-id="${item.id}" class="add-stock-button">Add Stock</button>
          <input type="number" class="dispense-input" placeholder="Dispense" data-id="${item.id}">
          <button data-id="${item.id}" class="dispense-button">Dispense</button>
        `;
        inventoryContainer.appendChild(itemDiv);
      });
    }
  
    // Handle adding new item
    addItemForm.addEventListener('submit', event => {
      event.preventDefault();
      const newItem = {
        name: itemNameInput.value,
        quantity: parseInt(itemQuantityInput.value),
        category: itemCategorySelect.value
      };
  
      fetch('http://localhost:3000/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newItem)
      })
        .then(response => response.json())
        .then(data => {
          fetchInventory();
          addToStockTracker('add', newItem.name, newItem.quantity, 0, newItem.quantity);
          addItemForm.reset(); // Clear form fields after submission
        });
    });
  
    // Handle event delegation for inventory container
    inventoryContainer.addEventListener('click', (event) => {
      if (event.target.classList.contains('add-stock-button')) {
        handleAddStock(event);
      } else if (event.target.classList.contains('dispense-button')) {
        handleDispense(event);
      }
    });
  
    // Handle adding stock
    function handleAddStock(event) {
      const itemId = event.target.dataset.id;
      const addStockInput = document.querySelector(`.add-stock-input[data-id="${itemId}"]`);
      const additionalQuantity = parseInt(addStockInput.value);
  
      if (!isNaN(additionalQuantity) && additionalQuantity > 0) {
        fetch(`http://localhost:3000/inventory/${itemId}`)
          .then(response => response.json())
          .then(item => {
            const initialQuantity = item.quantity;
            const updatedItem = { ...item, quantity: item.quantity + additionalQuantity };
  
            fetch(`http://localhost:3000/inventory/${itemId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updatedItem)
            })
              .then(response => response.json())
              .then(data => {
                fetchInventory(); // Refresh inventory display
                addToStockTracker('add', item.name, additionalQuantity, initialQuantity, data.quantity);
              });
          });
      } else {
        alert("Please enter a valid positive number for the stock quantity.");
      }
    }
  
    // Handle dispensing item
    function handleDispense(event) {
      const itemId = event.target.dataset.id;
      const dispenseInput = document.querySelector(`.dispense-input[data-id="${itemId}"]`);
      const dispenseQuantity = parseInt(dispenseInput.value);
  
      if (!isNaN(dispenseQuantity) && dispenseQuantity > 0) {
        fetch(`http://localhost:3000/inventory/${itemId}`)
          .then(response => response.json())
          .then(item => {
            if (item.quantity >= dispenseQuantity) {
              const initialQuantity = item.quantity;
              const updatedItem = { ...item, quantity: item.quantity - dispenseQuantity };
  
              fetch(`http://localhost:3000/inventory/${itemId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedItem)
              })
                .then(response => response.json())
                .then(data => {
                  fetchInventory(); // Refresh inventory display
                  addToStockTracker('dispense', item.name, dispenseQuantity, initialQuantity, data.quantity);
                });
            } else {
              alert("Not enough stock available to dispense the requested quantity.");
            }
          });
      } else {
        alert("Please enter a valid positive number for the dispense quantity.");
      }
    }
  
    // Function to add stock activity to stock tracker in db.json
    function addToStockTracker(action, itemName, quantityChanged, initialQuantity, finalQuantity) {
      const date = new Date().toISOString();
      const logEntry = {
        date: date,
        action: action,
        itemName: itemName,
        initialQuantity: initialQuantity,
        quantityChanged: quantityChanged,
        finalQuantity: finalQuantity
      };
  
      fetch('http://localhost:3000/stockTracker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      })
        .then(response => response.json())
        .then(data => {
          console.log('Stock activity logged:', data);
          fetchStockTracker(); // Refresh stock tracker display
        })
        .catch(error => console.error('Error logging stock activity:', error));
    }
  
    // Fetch stock tracker data from json-server
    function fetchStockTracker() {
      fetch('http://localhost:3000/stockTracker')
        .then(response => response.json())
        .then(data => displayStockTracker(data));
    }
  
    // Display stock tracker entries
    function displayStockTracker(entries) {
      stockTrackerBody.innerHTML = '';
      entries.forEach(entry => {
        const row = `
          <tr>
            <td>${new Date(entry.date).toLocaleString()}</td>
            <td>${entry.action}</td>
            <td>${entry.itemName}</td>
            <td>${entry.initialQuantity}</td>
            <td>${entry.quantityChanged}</td>
            <td>${entry.finalQuantity}</td>
          </tr>
        `;
        stockTrackerBody.insertAdjacentHTML('beforeend', row);
      });
    }
  
    // Search functionality
    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase();
      const filteredItems = inventory.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
      );
      displayInventory(filteredItems);
    });
  
    // Fetch inventory and stock tracker on initial load
    fetchInventory();
    fetchStockTracker();
  });
  