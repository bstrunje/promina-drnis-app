ALTER TABLE members
    ADD COLUMN tshirt_size VARCHAR(4) CHECK (tshirt_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL')),
    ADD COLUMN shell_jacket_size VARCHAR(4) CHECK (shell_jacket_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'));