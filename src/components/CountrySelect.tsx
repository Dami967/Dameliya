import { countryCodeForName, countryOptions } from '../lib/countries';

export function CountrySelect({ language, value, label, onChange }: {
  language: string; value: string; label: string; onChange: (country: string) => void;
}) {
  const options = countryOptions(language);
  const selectedCode = countryCodeForName(value, language);
  const placeholder = language === 'ru' ? 'Выбери страну'
    : language === 'kk' ? 'Елді таңда' : 'Choose a country';
  return <label>{label}<select value={selectedCode} onChange={(event) => {
    const selected = options.find((option) => option.code === event.target.value);
    onChange(selected?.name ?? '');
  }}><option value="">{placeholder}</option>
    {options.map((country) => <option value={country.code} key={country.code}>{country.name}</option>)}
  </select></label>;
}
