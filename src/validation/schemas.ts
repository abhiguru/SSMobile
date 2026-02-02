import * as yup from 'yup';
import { PHONE_REGEX } from '../constants';

export const addressSchema = yup.object({
  label: yup.string().default(''),
  full_name: yup.string().default(''),
  phone: yup
    .string()
    .default('')
    .test(
      'valid-phone',
      'addresses.errors.phoneInvalid',
      (val) => !val || PHONE_REGEX.test(val.replace(/\D/g, '').slice(-10))
    ),
  address_line1: yup.string().required('addresses.errors.addressRequired'),
  address_line2: yup.string().default(''),
  city: yup.string().required('addresses.errors.cityRequired'),
  state: yup.string().default(''),
  pincode: yup
    .string()
    .required('addresses.errors.pincodeRequired')
    .length(6, 'addresses.errors.pincodeInvalid'),
  is_default: yup.boolean().default(false),
  lat: yup.number().nullable().default(null),
  lng: yup.number().nullable().default(null),
  formatted_address: yup.string().nullable().default(null),
});

export type AddressFormData = yup.InferType<typeof addressSchema>;
