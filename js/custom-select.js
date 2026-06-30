/**
 * Custom Select Dropdowns
 * Replaces native <select> with styled custom dropdowns
 */

class CustomSelect {
    constructor(selectElement) {
        this.select = selectElement;
        this.options = Array.from(selectElement.options);
        this.selectedIndex = selectElement.selectedIndex;

        this.createCustomSelect();
        this.attachEventListeners();
    }

    createCustomSelect() {
        // Create wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'custom-select-wrapper';

        // Create custom select container
        this.container = document.createElement('div');
        this.container.className = 'custom-select';

        // Copy styles from original select
        const computedStyle = window.getComputedStyle(this.select);
        this.container.style.width = computedStyle.width;
        this.container.style.padding = computedStyle.padding;
        this.container.style.fontSize = computedStyle.fontSize;

        // Create selected display
        this.selected = document.createElement('div');
        this.selected.className = 'custom-select-selected';
        this.selected.textContent = this.options[this.selectedIndex]?.text || 'Select...';

        // Create arrow
        const arrow = document.createElement('div');
        arrow.className = 'custom-select-arrow';
        arrow.innerHTML = `<svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L6 6L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        // Create options dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'custom-select-dropdown';

        this.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'custom-select-option';
            optionElement.textContent = option.text;
            optionElement.dataset.value = option.value;
            optionElement.dataset.index = index;

            if (index === this.selectedIndex) {
                optionElement.classList.add('selected');
            }

            if (option.disabled) {
                optionElement.classList.add('disabled');
            }

            this.dropdown.appendChild(optionElement);
        });

        // Assemble
        this.container.appendChild(this.selected);
        this.container.appendChild(arrow);
        this.container.appendChild(this.dropdown);
        this.wrapper.appendChild(this.container);

        // Store instance reference in wrapper
        this.wrapper._customSelectInstance = this;

        // Replace original select
        this.select.style.display = 'none';
        this.select.parentNode.insertBefore(this.wrapper, this.select);
    }

    attachEventListeners() {
        // Toggle dropdown on click
        this.selected.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Select option
        this.dropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.custom-select-option');
            if (option && !option.classList.contains('disabled')) {
                this.selectOption(parseInt(option.dataset.index));
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Keyboard navigation
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateOptions(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateOptions(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.container.classList.contains('open')) {
                    this.closeDropdown();
                } else {
                    this.openDropdown();
                }
            } else if (e.key === 'Escape') {
                this.closeDropdown();
            }
        });

        // Make focusable
        this.container.setAttribute('tabindex', '0');
    }

    toggleDropdown() {
        if (this.container.classList.contains('open')) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        // Close other open dropdowns
        document.querySelectorAll('.custom-select.open').forEach(select => {
            if (select !== this.container) {
                select.classList.remove('open');
            }
        });

        this.container.classList.add('open');

        // Scroll selected option into view
        const selectedOption = this.dropdown.querySelector('.custom-select-option.selected');
        if (selectedOption) {
            selectedOption.scrollIntoView({ block: 'nearest' });
        }
    }

    closeDropdown() {
        this.container.classList.remove('open');
    }

    selectOption(index) {
        this.selectedIndex = index;

        // Update display
        this.selected.textContent = this.options[index].text;

        // Update selected class
        this.dropdown.querySelectorAll('.custom-select-option').forEach((opt, i) => {
            opt.classList.toggle('selected', i === index);
        });

        // Update original select
        this.select.selectedIndex = index;

        // Trigger change event
        const event = new Event('change', { bubbles: true });
        this.select.dispatchEvent(event);

        this.closeDropdown();
    }

    navigateOptions(direction) {
        const newIndex = this.selectedIndex + direction;
        if (newIndex >= 0 && newIndex < this.options.length) {
            if (!this.options[newIndex].disabled) {
                this.selectOption(newIndex);
            }
        }
    }

    destroy() {
        this.wrapper.remove();
        this.select.style.display = '';
    }
}

// Initialize custom selects
function initCustomSelects() {
    // Don't apply to selects that should remain native (add .native-select class to exclude)
    const selects = document.querySelectorAll('select:not(.native-select)');

    selects.forEach(select => {
        // Skip if select is already hidden (already customized)
        if (select.style.display === 'none' && select.previousElementSibling?.classList.contains('custom-select-wrapper')) {
            // Update existing custom select if select innerHTML changed
            const wrapper = select.previousElementSibling;
            const existingCustomSelect = wrapper._customSelectInstance;

            if (existingCustomSelect) {
                // Destroy and recreate to reflect new options
                existingCustomSelect.destroy();
            }
        }

        new CustomSelect(select);
    });
}

// Auto-initialize on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomSelects);
} else {
    initCustomSelects();
}

// Export for manual initialization
window.initCustomSelects = initCustomSelects;
window.CustomSelect = CustomSelect;
