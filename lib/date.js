export function formatDateNl(date) {
    return new Intl.DateTimeFormat('nl-NL').format(date)
}