const rentButtons = document.querySelectorAll('.car .btn');

rentButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const card = button.closest('.car');
        const priceElement = card?.querySelector('.car__price-day span');
        const titleElement = card?.querySelector('.car__title');

        // Keep one booking dialog open at a time and ignore incomplete cards.
        if (!card || !priceElement || !titleElement || document.querySelector('.booking-modal')) {
            return;
        }

        const basePrice = Number.parseFloat(priceElement.textContent.replace(/[^0-9.]/g, ''));
        if (!Number.isFinite(basePrice)) {
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'booking-modal';
        modal.setAttribute('role', 'presentation');

        const dialog = document.createElement('section');
        dialog.className = 'booking-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'booking-title');

        const header = document.createElement('div');
        header.className = 'booking-dialog__header';

        const heading = document.createElement('h2');
        heading.className = 'booking-dialog__title';
        heading.id = 'booking-title';
        heading.textContent = 'Book ' + titleElement.textContent;

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'booking-dialog__close';
        closeButton.setAttribute('aria-label', 'Close booking window');
        closeButton.textContent = '\u00d7';

        const rate = document.createElement('p');
        rate.className = 'booking-dialog__rate';
        rate.textContent = '$' + basePrice.toFixed(2) + ' per day';

        const dateFields = document.createElement('div');
        dateFields.className = 'booking-dialog__dates';

        // Build labeled date controls with DOM methods to keep the markup safe.
        const createDateField = (labelText, inputLabel) => {
            const field = document.createElement('label');
            field.className = 'booking-dialog__field';
            field.textContent = labelText;

            const input = document.createElement('input');
            input.type = 'date';
            input.className = 'booking-date';
            input.setAttribute('aria-label', inputLabel);
            input.required = true;
            field.appendChild(input);
            dateFields.appendChild(field);
            return input;
        };

        const startDateInput = createDateField('Pick-up date', 'Rental start date');
        const endDateInput = createDateField('Return date', 'Rental end date');
        endDateInput.disabled = true;

        const totalDisplay = document.createElement('p');
        totalDisplay.className = 'booking-total';
        totalDisplay.setAttribute('aria-live', 'polite');
        totalDisplay.textContent = 'Choose dates to calculate the rental cost.';

        const confirmationButton = document.createElement('button');
        confirmationButton.type = 'button';
        confirmationButton.className = 'btn booking-confirm';
        confirmationButton.textContent = 'Confirm Booking';
        confirmationButton.disabled = true;

        const closeModal = () => {
            document.removeEventListener('keydown', handleKeyDown);
            modal.remove();
            document.body.classList.remove('booking-modal-open');
            button.focus();
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeModal();
            }
        };

        const getUtcDay = (dateValue) => {
            const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
            if (!match) {
                return null;
            }

            const [, yearText, monthText, dayText] = match;
            const year = Number(yearText);
            const month = Number(monthText);
            const day = Number(dayText);
            const timestamp = Date.UTC(year, month - 1, day);
            const date = new Date(timestamp);

            if (date.getUTCFullYear() !== year
                || date.getUTCMonth() !== month - 1
                || date.getUTCDate() !== day) {
                return null;
            }

            // Compare calendar dates in UTC to avoid local time zone offsets.
            return timestamp;
        };

        const validateDateInput = (input) => {
            if (input.validity.badInput || (input.value && getUtcDay(input.value) === null)) {
                alert('That booking date does not exist. Please select a valid date.');
                input.value = '';
                return false;
            }

            return true;
        };

        const calculatePrice = () => {
            if (!startDateInput.value || !endDateInput.value) {
                totalDisplay.textContent = 'Choose dates to calculate the rental cost.';
                confirmationButton.disabled = true;
                return;
            }

            const startDay = getUtcDay(startDateInput.value);
            const endDay = getUtcDay(endDateInput.value);
            if (startDay === null || endDay === null) {
                totalDisplay.textContent = 'Select valid rental dates to calculate the total.';
                confirmationButton.disabled = true;
                return;
            }

            const rentalDays = (endDay - startDay) / (24 * 60 * 60 * 1000);

            if (rentalDays <= 0) {
                totalDisplay.textContent = 'Return date must be after the pick-up date.';
                confirmationButton.disabled = true;
                return;
            }

            const finalPrice = (basePrice * rentalDays).toFixed(2);
            totalDisplay.textContent = `Total: $${finalPrice} (${rentalDays} ${rentalDays === 1 ? 'day' : 'days'})`;
            confirmationButton.disabled = false;
            confirmationButton.dataset.finalPrice = finalPrice;
        };

        startDateInput.addEventListener('change', () => {
            if (!validateDateInput(startDateInput)) {
                endDateInput.value = '';
                endDateInput.disabled = true;
                totalDisplay.textContent = 'Choose dates to calculate the rental cost.';
                confirmationButton.disabled = true;
                return;
            }

            // Require the return date to follow the selected pick-up date.
            endDateInput.min = startDateInput.value;
            endDateInput.disabled = !startDateInput.value;

            if (endDateInput.value && endDateInput.value <= startDateInput.value) {
                endDateInput.value = '';
            }

            calculatePrice();
        });
        endDateInput.addEventListener('change', () => {
            if (!validateDateInput(endDateInput)) {
                calculatePrice();
                return;
            }

            calculatePrice();
        });
        confirmationButton.addEventListener('click', () => {
            if (confirmationButton.disabled) {
                return;
            }

            if (!validateDateInput(startDateInput) || !validateDateInput(endDateInput)) {
                calculatePrice();
                return;
            }

            // Replace the booking form with a confirmation summary.
            const finalPrice = confirmationButton.dataset.finalPrice;
            const successIcon = document.createElement('div');
            successIcon.className = 'booking-success__icon';
            successIcon.setAttribute('aria-hidden', 'true');
            successIcon.textContent = '\u2713';

            const successHeading = document.createElement('h2');
            successHeading.className = 'booking-success__title';
            successHeading.id = 'booking-success-title';
            successHeading.textContent = 'Booking successful!';

            const successMessage = document.createElement('p');
            successMessage.className = 'booking-success__message';
            successMessage.textContent = titleElement.textContent + ' is booked from '
                + startDateInput.value + ' to ' + endDateInput.value + '.';

            const successTotal = document.createElement('p');
            successTotal.className = 'booking-success__total';
            successTotal.textContent = 'Total paid: $' + finalPrice;

            const successCloseButton = document.createElement('button');
            successCloseButton.type = 'button';
            successCloseButton.className = 'btn booking-confirm';
            successCloseButton.textContent = 'Done';
            successCloseButton.addEventListener('click', closeModal);

            dialog.removeAttribute('aria-labelledby');
            dialog.setAttribute('aria-labelledby', successHeading.id);
            dialog.replaceChildren(
                successIcon,
                successHeading,
                successMessage,
                successTotal,
                successCloseButton
            );
            successCloseButton.focus();
        });
        // Allow dismissal using the close button, backdrop, or Escape key.
        closeButton.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
        document.addEventListener('keydown', handleKeyDown);

        header.append(heading, closeButton);
        dialog.append(header, rate, dateFields, totalDisplay, confirmationButton);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        document.body.classList.add('booking-modal-open');
        startDateInput.focus();
    });
});
