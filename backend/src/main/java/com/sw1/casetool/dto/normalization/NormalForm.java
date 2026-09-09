package com.sw1.casetool.dto.normalization;

public enum NormalForm {
    NF1("1NF"),
    NF2("2NF"),
    NF3("3NF");

    private final String label;

    NormalForm(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
